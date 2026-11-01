import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/db/client";
import type { OrderStatus, PaymentStatus } from "@/db/generated/enums";
import { env } from "@/core/utils/env";
import { createToken, hashToken } from "@/core/utils/tokens";
import { sendEmail } from "@/core/networking/external/email-client";
import { statusesThatCanTransitionTo } from "@/core/modules/previews/status";
import { buildOrderConfirmation } from "@/core/modules/orders/emails";
import { canTransitionOrder, orderStatusesThatCanTransitionTo } from "@/core/modules/orders/status";
import { maskEmail } from "@/core/modules/orders/utils";
import { getShopSettings } from "@/core/modules/settings/service";
import { animals } from "@/data/options";
import { MANUAL_PAYMENT_PROVIDER, type ManualPaymentMethod } from "@/data/payment-methods";
import { CURRENCY } from "@/data/pricing";
import { PAYMENT_SYNC_MIN_INTERVAL_MS, PENDING_ORDER_MAX_AGE_MS } from "@/data/checkout";
import { paymentProvider } from "./providers";
import { BANCONTACT_CALLBACK_PATH } from "./providers/bancontact";
import type { ProviderPayment } from "./providers/types";

/*
 * The only place where an order becomes PAID. Every path (signed Bancontact callback, return page, admin button, cron)
 * ends in processPayment with a payment fetched from Bancontact's API just now, never with data from a request body.
 * Idempotent: the conditional updates only move an order or preview when its current status allows it, so the same
 * webhook twice (or webhook + return page at once) changes nothing the second time.
 *
 * On PAID the previews move UPLOADED → PAID, which puts them in the backoffice's "Te reviewen" list, exactly as
 * the Shopify webhook did. From there the AI pipeline takes over; nothing in it is touched here.
 */

export type ProcessSource = "webhook" | "return-page" | "cron" | `admin:${string}`;

export class ManualPaymentNotAllowedError extends Error {}

export type ProcessResult =
  | { outcome: "unknown_payment" }
  | { outcome: "mismatch"; orderId: string }
  | { outcome: "processed"; orderId: string; orderStatus: OrderStatus };

const FAILED_PAYMENT_TO_ORDER: Partial<Record<PaymentStatus, OrderStatus>> = {
  CANCELED: "CANCELLED",
  FAILED: "CANCELLED",
  EXPIRED: "EXPIRED",
};

function isPublicHttps(url: string) {
  const { hostname, protocol } = new URL(url);
  const local = hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local") || hostname.endsWith(".localhost");
  return protocol === "https:" && !local;
}

// Bancontact can't reach localhost: no callback there, the return page asks Bancontact instead.
function callbackUrl() {
  return isPublicHttps(env.APP_URL) ? `${env.APP_URL}${BANCONTACT_CALLBACK_PATH}` : null;
}

export class InvalidProviderPaymentError extends Error {
  constructor(public readonly paymentId: string, message: string) {
    super(message);
  }
}

/** Creates a Bancontact payment for an order and stores it. The status token ends up in the return URL. */
export async function createOrderPayment(order: { id: string; number: string; totalCents: number }, statusToken: string) {
  const returnUrl = new URL("/checkout/return", env.APP_URL);
  returnUrl.searchParams.set("order", order.id);
  returnUrl.searchParams.set("t", statusToken);

  const payment = await paymentProvider.createPayment({
    amountCents: order.totalCents,
    reference: order.number,
    description: `Palleys bestelling ${order.number}`,
    // Bancontact only accepts https here; locally that means `npm run dev:https`.
    returnUrl: returnUrl.toString(),
    callbackUrl: callbackUrl(),
  });
  if (!payment.checkoutUrl || !paymentProvider.isCheckoutUrl(payment.checkoutUrl)) {
    throw new InvalidProviderPaymentError(payment.id, `Unexpected checkout URL for ${payment.id}`);
  }
  if (payment.amountCents !== order.totalCents) {
    throw new InvalidProviderPaymentError(payment.id, `Payment ${payment.id} amount ${payment.amountCents} != order ${order.totalCents}`);
  }

  await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: paymentProvider.name,
      providerPaymentId: payment.id,
      mode: payment.mode,
      method: payment.method,
      status: payment.status,
      amountCents: payment.amountCents,
      checkoutUrl: payment.checkoutUrl,
      rawLastStatus: payment.snapshot as object,
      // Not synced yet: the return page's first poll asks Bancontact straight away.
    },
  });
  return { id: payment.id, mode: payment.mode, checkoutUrl: payment.checkoutUrl };
}

/** Callback entry point, after the signature was checked. Only the id is used; unknown ids are ignored. */
export async function handlePaymentWebhook(paymentId: string): Promise<ProcessResult> {
  if (!paymentProvider.isPaymentId(paymentId)) return { outcome: "unknown_payment" };
  // Cheap check first: ids we never created aren't looked up at Bancontact at all.
  const known = await prisma.payment.findUnique({ where: { providerPaymentId: paymentId }, select: { id: true } });
  if (!known) {
    console.warn(`[payments] webhook for unknown payment ${paymentId}`);
    return { outcome: "unknown_payment" };
  }
  return processPayment(await paymentProvider.getPayment(paymentId), "webhook");
}

/**
 * Asks Bancontact about an order's latest payment and processes the answer. Used by the return page (where webhooks
 * can't reach localhost), the admin and the cron job. Skips the call when the last check was very recent.
 */
export async function syncOrderPayment(
  orderId: string,
  source: ProcessSource,
  { minIntervalMs = PAYMENT_SYNC_MIN_INTERVAL_MS }: { minIntervalMs?: number } = {},
): Promise<ProcessResult | null> {
  const payment = await prisma.payment.findFirst({
    where: { orderId, provider: paymentProvider.name },
    orderBy: { createdAt: "desc" },
    select: { id: true, providerPaymentId: true, lastSyncedAt: true },
  });
  if (!payment) return null;

  // Claim the sync slot atomically, so ten polling tabs make one Bancontact call, not ten.
  const threshold = new Date(Date.now() - minIntervalMs);
  const { count } = await prisma.payment.updateMany({
    where: { id: payment.id, OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: threshold } }] },
    data: { lastSyncedAt: new Date() },
  });
  if (count === 0) return null;

  return processPayment(await paymentProvider.getPayment(payment.providerPaymentId), source);
}

async function flagOrder(orderId: string, reason: string) {
  console.error(`[payments] order ${orderId} needs attention: ${reason}`);
  // Keep earlier reasons: an admin should see everything that went wrong.
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { attentionReason: true } });
  if (order?.attentionReason?.includes(reason)) return;
  await prisma.order.update({
    where: { id: orderId },
    data: { attentionReason: [order?.attentionReason, reason].filter(Boolean).join(" | ").slice(0, 1000) },
  });
}

export async function processPayment(payment: ProviderPayment, source: ProcessSource): Promise<ProcessResult> {
  const stored = await prisma.payment.findUnique({
    where: { providerPaymentId: payment.id },
    select: {
      id: true,
      amountCents: true,
      order: { select: { id: true, number: true, status: true, totalCents: true } },
    },
  });
  if (!stored) {
    console.warn(`[payments] unknown payment ${payment.id} (${source})`);
    return { outcome: "unknown_payment" };
  }
  const order = stored.order;

  await prisma.payment.update({
    where: { id: stored.id },
    data: {
      status: payment.status,
      mode: payment.mode,
      method: payment.method,
      refundedCents: payment.refundedCents,
      chargedBackCents: payment.chargedBackCents,
      rawLastStatus: payment.snapshot as object,
      lastSyncedAt: new Date(),
    },
  });

  // The provider's answer has to match what we asked for. If it doesn't, we never mark the order paid automatically.
  const problems: string[] = [];
  if (payment.reference !== order.number) problems.push(`referentie ${payment.reference ?? "leeg"} ≠ ${order.number}`);
  if (payment.currency !== CURRENCY) problems.push(`munt ${payment.currency}`);
  if (payment.amountCents !== stored.amountCents || payment.amountCents !== order.totalCents) {
    problems.push(`bedrag ${payment.amountCents} ≠ order ${order.totalCents}`);
  }
  if (problems.length > 0) {
    await flagOrder(order.id, `Betaling ${payment.id}: ${problems.join(", ")}`);
    return { outcome: "mismatch", orderId: order.id };
  }

  if (payment.status === "PAID") await markOrderPaid(order.id, order.number, source);

  const closedStatus = FAILED_PAYMENT_TO_ORDER[payment.status];
  if (closedStatus) await closeUnpaidOrder(order.id, payment.id, closedStatus, source);

  if (payment.chargedBackCents > 0) {
    await flagOrder(order.id, `Chargeback van ${payment.chargedBackCents} cent op ${payment.id}`);
  }
  if (payment.refundedCents > 0 && payment.refundedCents >= payment.amountCents) {
    await moveOrder(order.id, "REFUNDED", source, `Volledig terugbetaald (${payment.id})`);
  }

  const current = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: { status: true } });
  if (current.status === "PAID") await sendConfirmationOnce(order.id);
  return { outcome: "processed", orderId: order.id, orderStatus: current.status };
}

/** Conditional status change with a log row. Returns false when the order wasn't in a status that allows it. */
export async function moveOrder(orderId: string, to: OrderStatus, source: ProcessSource, note?: string) {
  const from = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!from || !canTransitionOrder(from.status, to)) return false;
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({ where: { id: orderId, status: from.status }, data: { status: to } });
    if (count === 0) return false;
    await tx.orderStatusChange.create({ data: { orderId, fromStatus: from.status, toStatus: to, source, note } });
    return true;
  });
}

async function closeUnpaidOrder(orderId: string, paymentId: string, to: OrderStatus, source: ProcessSource) {
  // Only the order's newest payment may close it (a retry could have created a second one).
  const latest = await prisma.payment.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    select: { providerPaymentId: true },
  });
  if (latest?.providerPaymentId !== paymentId) return;
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true, createdBy: true } });
  if (order?.status !== "PENDING_PAYMENT") return;
  // An order an admin added stays open when a payment link lapses: they make a new link or cancel it themselves.
  if (order.createdBy) return;
  await moveOrder(orderId, to, source, `Betaalstatus van ${paymentId}`);
}

const animalTypeOf = (animal: string | null) => animals.find((a) => a.value === animal)?.animalType ?? null;

async function markOrderPaid(orderId: string, orderNumber: string, source: ProcessSource) {
  const conflicts = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true, email: true, items: { select: { previewId: true, quantity: true, animal: true } } },
    });
    const paidAt = new Date();
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: { in: orderStatusesThatCanTransitionTo("PAID") } },
      data: { status: "PAID", paidAt },
    });
    if (count === 0) return null; // already paid: webhook retry or a parallel sync

    await tx.orderStatusChange.create({ data: { orderId, fromStatus: order.status, toStatus: "PAID", source } });

    const problems: string[] = [];
    for (const item of order.items) {
      if (!item.previewId) continue; // a collectible has no pipeline to start
      // Same fields the Shopify webhook set; the review list and the print file name read these.
      const updated = await tx.preview.updateMany({
        where: { id: item.previewId, status: { in: statusesThatCanTransitionTo("PAID") } },
        data: {
          status: "PAID",
          orderNumber,
          email: order.email,
          paidAt,
          quantity: item.quantity,
          expiresAt: null, // paid previews no longer expire; photos go after shipping (photosDeleteAt)
        },
      });
      if (updated.count === 1) {
        const animalType = animalTypeOf(item.animal);
        if (animalType) {
          // Prefill the animal the customer picked, unless an admin already chose one.
          await tx.preview.updateMany({ where: { id: item.previewId, animalType: null }, data: { animalType } });
        }
        continue;
      }
      const preview = await tx.preview.findUnique({
        where: { id: item.previewId },
        select: { status: true, orderNumber: true },
      });
      if (preview?.orderNumber === orderNumber) continue; // already ours
      problems.push(
        preview
          ? `Preview ${item.previewId.slice(0, 8)} had al status ${preview.status}${preview.orderNumber ? ` (order ${preview.orderNumber})` : ""}: mogelijk dubbel betaald, terugbetalen?`
          : `Preview ${item.previewId.slice(0, 8)} bestaat niet meer`,
      );
    }
    return problems;
  });

  if (conflicts === null) return;
  console.info(`[payments] order ${orderNumber} paid (${source})`);
  if (conflicts.length > 0) await flagOrder(orderId, conflicts.join(" | "));
}

/** Sends the confirmation mail at most once per order, even with concurrent webhooks. */
async function sendConfirmationOnce(orderId: string) {
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, confirmationSentAt: null },
    data: { confirmationSentAt: new Date() },
  });
  if (claimed.count === 0) return;

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: { select: { title: true, quantity: true, unitCents: true, notes: true, withdrawable: true } },
      shipment: { select: { label: true, deliveryType: true } },
    },
  });
  // A manually added order can come without an e-mail address: nobody to send it to.
  if (!order.email) {
    await prisma.order.update({ where: { id: orderId }, data: { confirmationSentAt: null } });
    return;
  }
  try {
    const { company, content } = await getShopSettings();
    const mail = buildOrderConfirmation(order, env.APP_URL, { company, deliveryTime: content.deliveryTime });
    const sent = await sendEmail({ to: order.email, ...mail, idempotencyKey: `order-confirmation-${order.id}` });
    if (!sent) {
      console.warn(`[payments] confirmation for ${order.number} not sent: e-mail is not configured`);
      await prisma.order.update({ where: { id: orderId }, data: { confirmationSentAt: null } });
    }
  } catch (error) {
    console.error(
      `[payments] confirmation for ${order.number} (${maskEmail(order.email)}) failed:`,
      error instanceof Error ? error.message : error,
    );
    await prisma.order.update({ where: { id: orderId }, data: { confirmationSentAt: null } });
    await flagOrder(orderId, "Bevestigingsmail kon niet verstuurd worden");
  }
}

/**
 * Admin records money that reached us outside the checkout (cash, a transfer, a gift). Only on orders an admin added
 * themself: a website order is only ever paid through Bancontact. Goes through the same markOrderPaid as a real payment,
 * so previews land in "Te reviewen" the same way.
 */
export async function recordManualPayment(
  orderId: string,
  method: ManualPaymentMethod,
  adminName: string,
  { sendConfirmation }: { sendConfirmation: boolean },
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { number: true, status: true, totalCents: true, createdBy: true },
  });
  if (!order) return null;
  if (!order.createdBy || order.status !== "PENDING_PAYMENT") throw new ManualPaymentNotAllowedError(orderId);

  await prisma.payment.create({
    data: {
      orderId,
      provider: MANUAL_PAYMENT_PROVIDER,
      providerPaymentId: `manual-${randomUUID()}`,
      method,
      status: "PAID",
      amountCents: order.totalCents,
    },
  });
  await markOrderPaid(orderId, order.number, `admin:${adminName}`);
  if (sendConfirmation) await sendConfirmationOnce(orderId);
  return { orderId };
}

/**
 * A (new) Bancontact payment link for an order an admin added. Links lapse after 20 minutes, so this can be repeated.
 * The status token in the return URL is replaced each time; only its hash is stored, so the old one can't be reused.
 */
export async function createManualOrderPaymentLink(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, number: true, status: true, totalCents: true, createdBy: true },
  });
  if (!order) return null;
  if (!order.createdBy || order.status !== "PENDING_PAYMENT" || order.totalCents <= 0) {
    throw new ManualPaymentNotAllowedError(orderId);
  }
  const statusToken = createToken();
  await prisma.order.update({ where: { id: orderId }, data: { statusTokenHash: hashToken(statusToken) } });
  const payment = await createOrderPayment(order, statusToken);
  return { checkoutUrl: payment.checkoutUrl };
}

/** Admin action: send the confirmation mail again (e.g. after configuring Resend). */
export async function resendConfirmation(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order || order.status === "PENDING_PAYMENT" || order.status === "CANCELLED" || order.status === "EXPIRED") {
    return false;
  }
  await prisma.order.update({ where: { id: orderId }, data: { confirmationSentAt: null } });
  await sendConfirmationOnce(orderId);
  const after = await prisma.order.findUnique({ where: { id: orderId }, select: { confirmationSentAt: true } });
  return Boolean(after?.confirmationSentAt);
}

/**
 * Cron: unpaid orders older than PENDING_ORDER_MAX_AGE_MS are checked at Bancontact. Final statuses close them through
 * processPayment. Payments still reported as open after a day are closed locally; a late payment would
 * still move the order to PAID (EXPIRED → PAID is allowed).
 */
export async function expireStaleOrders() {
  const cutoff = new Date(Date.now() - PENDING_ORDER_MAX_AGE_MS);
  const hardCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stale = await prisma.order.findMany({
    // Only website orders: one an admin added stays open until it's paid or they cancel it.
    where: { status: "PENDING_PAYMENT", createdAt: { lt: cutoff }, createdBy: null },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { id: true, createdAt: true },
  });

  let checked = 0;
  let expired = 0;
  for (const order of stale) {
    try {
      await syncOrderPayment(order.id, "cron", { minIntervalMs: 0 });
      checked++;
    } catch (error) {
      console.error(`[payments] cron sync for ${order.id} failed:`, error instanceof Error ? error.message : error);
    }
    const now = await prisma.order.findUnique({ where: { id: order.id }, select: { status: true } });
    const noPayment = !(await prisma.payment.findFirst({ where: { orderId: order.id }, select: { id: true } }));
    if (now?.status === "PENDING_PAYMENT" && (order.createdAt < hardCutoff || noPayment)) {
      if (await moveOrder(order.id, "EXPIRED", "cron", noPayment ? "Geen betaling" : "Na 24 uur nog niet betaald")) {
        expired++;
      }
    }
  }
  return { checked, expired };
}
