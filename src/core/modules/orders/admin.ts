import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/db/client";
import { computeTotals, DEFAULT_SIZE, priceFor, variantFor, variantLabel } from "@/core/modules/catalog/utils";
import { paymentProvider } from "@/core/modules/payments/providers";
import {
  createManualOrderPaymentLink,
  moveOrder,
  recordManualPayment,
} from "@/core/modules/payments/service";
import { getShopSettings } from "@/core/modules/settings/service";
import { resolveDeliveryOption } from "@/core/modules/shipping/service";
import { createToken, hashToken } from "@/core/utils/tokens";
import { MANUAL_PAYMENT_PROVIDER } from "@/data/payment-methods";
import { CURRENCY } from "@/data/pricing";
import { HANDOVER_DELIVERY } from "@/data/shipping";
import { allItemsCheckedIn, ITEM_READY_PREVIEW_STATUS, OPEN_ORDER_STATUSES } from "./check-in";
import { nextOrderNumber, OrderNotFoundError } from "./service";
import type { ManualOrderInput, ManualOrderResult, OrderStatusActionInput } from "./types";

/*
 * What only the backoffice does with orders: adding one by hand, ticking off items, moving an order along. An added
 * order uses the same tables, numbers and payment path as a website order, so everything after this (review, print
 * files, history) works the same. It is marked by Order.createdBy: the cron leaves those alone and the customer never
 * accepted the terms online, so that stays empty.
 */

/** A refusal the admin can act on; the message is shown as it is. */
export class OrderActionError extends Error {}

type LineData = {
  previewId: string | null;
  collectibleId: string | null;
  sku: string;
  size: string;
  edition: string | null;
  animal: string | null;
  title: string;
  notes: string | null;
  quantity: number;
  unitCents: number;
  withdrawable: boolean;
};

async function resolveLines(input: ManualOrderInput) {
  const { catalog } = await getShopSettings();
  const collectibleIds = input.lines.flatMap((line) => (line.kind === "collectible" ? line.collectibleId : []));
  const collectibles = await prisma.collectible.findMany({ where: { id: { in: collectibleIds }, archivedAt: null } });

  return input.lines.map((line): LineData => {
    if (line.kind === "personalized") {
      const variant = variantFor(line.edition, line.animal);
      const labels = variantLabel(line.edition, line.animal);
      return {
        previewId: randomUUID(),
        collectibleId: null,
        sku: variant.sku,
        size: variant.size,
        edition: line.edition,
        animal: line.animal,
        title: `${labels.title} · ${labels.edition}`,
        notes: line.notes,
        quantity: line.quantity,
        unitCents: line.unitCents ?? priceFor(variant, catalog.prices),
        withdrawable: false,
      };
    }
    const collectible = collectibles.find((row) => row.id === line.collectibleId);
    if (!collectible) throw new OrderActionError("Deze collectible bestaat niet meer");
    return {
      previewId: null,
      collectibleId: collectible.id,
      sku: collectible.sku,
      size: DEFAULT_SIZE,
      edition: null,
      animal: null,
      title: collectible.name,
      notes: line.notes,
      quantity: line.quantity,
      unitCents: line.unitCents ?? collectible.priceCents,
      withdrawable: true,
    };
  });
}

async function resolveDelivery(input: ManualOrderInput, lines: LineData[]) {
  if (input.delivery.type === "handover") {
    return { ...HANDOVER_DELIVERY, priceCents: 0, checkoutIdentifier: null };
  }
  const address = { country: "BE" as const, postalCode: input.delivery.postalCode };
  const items = lines.map((line) => ({ size: DEFAULT_SIZE, quantity: line.quantity }));
  const option = await resolveDeliveryOption(input.delivery.optionId, address, items);
  if (!option) throw new OrderActionError("Deze verzendoptie is niet beschikbaar");
  return { ...option, priceCents: input.delivery.priceCents ?? option.priceCents };
}

export async function createManualOrder(input: ManualOrderInput, adminName: string): Promise<ManualOrderResult> {
  const lines = await resolveLines(input);
  const delivery = await resolveDelivery(input, lines);
  const totals = computeTotals(lines, delivery.priceCents);
  const address = input.delivery.type === "ship" ? input.delivery : null;

  if (input.payment.type === "bancontact") {
    if (!paymentProvider.isConfigured()) throw new OrderActionError("Bancontact Pro is nog niet gekoppeld");
    if (totals.totalCents <= 0) throw new OrderActionError("Een gratis order kan niet met Bancontact betaald worden");
  }

  const order = await prisma.$transaction(async (tx) => {
    const number = await nextOrderNumber(tx);
    // Previews without photos: the admin's browser uploads those right after this, and it can be done later too.
    // No expiry: a website upload expires when it isn't bought, this one is already on an order.
    await tx.preview.createMany({
      data: lines.flatMap((line) => (line.previewId ? { id: line.previewId, expiresAt: null } : [])),
    });
    return tx.order.create({
      data: {
        number,
        createdBy: adminName,
        email: input.customer.email,
        firstName: input.customer.firstName,
        lastName: input.customer.lastName,
        phone: input.customer.phone,
        street: address?.street,
        houseNumber: address?.houseNumber,
        postalCode: address?.postalCode,
        city: address?.city,
        country: "BE",
        currency: CURRENCY,
        ...totals,
        statusTokenHash: hashToken(createToken()),
        items: { create: lines },
        shipment: {
          create: {
            provider: delivery.provider,
            deliveryOptionId: delivery.id,
            deliveryType: delivery.deliveryType,
            carrier: delivery.carrier,
            label: delivery.label,
            priceCents: delivery.priceCents,
            checkoutIdentifier: delivery.checkoutIdentifier,
          },
        },
        statusChanges: {
          create: {
            fromStatus: null,
            toStatus: "PENDING_PAYMENT",
            source: `admin:${adminName}`,
            note: input.note ?? "Handmatig toegevoegd",
          },
        },
      },
      select: { id: true, number: true },
    });
  });

  const previews = lines.flatMap((line, lineIndex) => (line.previewId ? { lineIndex, previewId: line.previewId } : []));
  const result: ManualOrderResult = { orderId: order.id, number: order.number, previews, paymentLinkFailed: false };

  if (input.payment.type === "paid") {
    await recordManualPayment(order.id, input.payment.method, adminName, { sendConfirmation: input.sendConfirmation });
  } else if (input.payment.type === "bancontact") {
    // The order is in the database by now. A failed link doesn't undo it: the order page can make a new one.
    try {
      await createManualOrderPaymentLink(order.id);
    } catch (error) {
      console.error(`[orders] payment link for ${order.number} failed:`, error instanceof Error ? error.message : error);
      result.paymentLinkFailed = true;
    }
  }
  console.info(`[orders] ${order.number} added by an admin (${input.payment.type})`);
  return result;
}

/** Ticks an item off (or undoes that). A personalised Palley has to be print-ready first. */
export async function setItemCheckIn(orderId: string, itemId: string, checked: boolean, adminName: string) {
  const item = await prisma.orderItem.findFirst({
    where: { id: itemId, orderId },
    select: {
      title: true,
      order: { select: { status: true } },
      preview: { select: { status: true } },
    },
  });
  if (!item) throw new OrderNotFoundError(itemId);
  if (!OPEN_ORDER_STATUSES.includes(item.order.status)) {
    throw new OrderActionError("Items afvinken kan alleen bij een betaalde order die nog niet verzonden is");
  }
  if (checked && item.preview && item.preview.status !== ITEM_READY_PREVIEW_STATUS) {
    throw new OrderActionError("Dit model is nog niet klaar voor print: werk eerst de preview af");
  }

  await prisma.$transaction([
    prisma.orderItem.update({
      where: { id: itemId },
      data: { checkedInAt: checked ? new Date() : null, checkedInBy: checked ? adminName : null },
    }),
    prisma.orderStatusChange.create({
      data: {
        orderId,
        fromStatus: item.order.status,
        toStatus: item.order.status,
        source: `admin:${adminName}`,
        note: `${checked ? "Afgevinkt" : "Afvinken ongedaan gemaakt"}: ${item.title}`,
      },
    }),
  ]);
  return { itemId, checked };
}

/** Moves an order along by hand. The payment path handles PAID; this handles what comes after it, and giving up on one. */
export async function updateOrderStatus(orderId: string, input: OrderStatusActionInput, adminName: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      items: { select: { checkedInAt: true, preview: { select: { status: true } } } },
      payments: { select: { provider: true, status: true } },
    },
  });
  if (!order) throw new OrderNotFoundError(orderId);

  if (input.status === "SHIPPED") {
    const items = order.items.map((item) => ({ previewStatus: item.preview?.status ?? null, checkedInAt: item.checkedInAt }));
    if (!allItemsCheckedIn(items)) throw new OrderActionError("Vink eerst alle items af");
  }
  if (input.status === "REFUNDED") {
    // Bancontact refunds go through its portal and come back by themselves when the payment is checked.
    const paidManually = order.payments.some((payment) => payment.provider === MANUAL_PAYMENT_PROVIDER && payment.status === "PAID");
    if (!paidManually) throw new OrderActionError("Terugbetalen gebeurt via het Bancontact Pro-portaal");
  }

  const moved = await moveOrder(orderId, input.status, `admin:${adminName}`, input.note);
  if (!moved) throw new OrderActionError("Deze stap kan niet vanuit de huidige status");

  if (input.status === "SHIPPED") {
    await prisma.shipment.updateMany({
      where: { orderId },
      data: { shippedAt: new Date(), trackingCode: input.trackingCode },
    });
  }
  return { orderId, status: input.status };
}

