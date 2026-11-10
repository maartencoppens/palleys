import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/db/client";
import type { Prisma } from "@/db/generated/client";
import type { ReturnStatus, ReturnType } from "@/db/generated/enums";
import { env } from "@/core/utils/env";
import { createToken, hashToken } from "@/core/utils/tokens";
import { assertRateLimitFor, RateLimitError } from "@/core/utils/rate-limit";
import { createDownloadUrl, createUploadUrl, objectExists } from "@/core/networking/external/storage-client";
import { EmailError, sendEmail } from "@/core/networking/external/email-client";
import { localizedPath, toLocale, type Locale } from "@/core/locale/config";
import { MESSAGES } from "@/core/locale/messages";
import { itemTitle } from "@/core/modules/orders/emails";
import { nextOrderNumber } from "@/core/modules/orders/service";
import { activeQuantity } from "@/core/modules/orders/check-in";
import { maskEmail } from "@/core/modules/orders/utils";
import { flagOrder } from "@/core/modules/payments/service";
import { getShopSettings } from "@/core/modules/settings/service";
import { teamMailCc } from "@/core/modules/settings/types";
import { collectibleImageUrl } from "@/core/modules/collectibles/utils";
import type { AnimalOption } from "@/core/modules/animals/types";
import { batchRef } from "@/core/utils/naming";
import { IMAGE_EXTENSIONS } from "@/data/uploads";
import {
  RETURN_LINK_TTL_MS,
  RETURN_PHOTO_PREFIX,
  RETURN_SESSION_TTL_MS,
  RETURN_URL,
  WITHDRAWAL_DAYS,
} from "@/data/returns";
import { buildReturnDecisionMail, buildReturnLinkMail, buildReturnReceiptMail, buildReturnTeamMail } from "./emails";
import { canTransitionReturn, OPEN_RETURN_STATUSES, RETURN_ACCESS_ORDER_STATUSES } from "./status";
import {
  addDays,
  allowedQuantity,
  attentionNote,
  brusselsDay,
  cancelsProduction,
  isReturnPhotoKeyOf,
  itemReturnOptions,
  itemReturnStatus,
  receivedOn,
  sameEmail,
  withdrawalNeedsReturn,
  withoutAttentionNote,
  type CalendarDay,
} from "./utils";
import type {
  AdminReturnRequest,
  ReturnDecisionInput,
  ReturnLookupInput,
  ReturnOverview,
  ReturnPhotoUploadInput,
  ReturnReceipt,
  ReturnSubmitInput,
} from "./types";

/*
 * Cancelling, withdrawing and warranty claims from /retour, and how the team handles them. A customer gets in with
 * their order number and e-mail address, which only ever sends a one-time link to the order's own address; the link
 * opens a short session (cookie). What is allowed comes from utils.ts (the return policy), checked again here inside a
 * transaction that locks the order, so two tabs can't claim the same Palley twice. Refunds are done by hand in the
 * Bancontact Pro portal; nothing here moves money.
 */

/** The link or session doesn't (or no longer) work. Same answer for every reason. */
export class ReturnAccessError extends Error {}
/** The policy doesn't allow this (any more) for one of the items. */
export class ReturnNotAllowedError extends Error {}
/** A photo key that isn't this order's, or wasn't uploaded. */
export class ReturnPhotoError extends Error {}
export class ReturnNotFoundError extends Error {}
/** A refusal the admin can act on; the message is shown as it is. */
export class ReturnActionError extends Error {}

const CUSTOMER_SOURCE = "customer";
const adminSource = (adminName: string) => `admin:${adminName}`;
const typeLabel = (type: ReturnType) => MESSAGES.nl.returns.types[type];

// ---------- Lookup and link ----------

/**
 * Sends a one-time link when the order number and e-mail address belong together and the order was paid. Returns
 * nothing either way, and the route answers before this runs: whether an order exists can't be read from the answer
 * or its timing. Too many lookups of one number are dropped silently, so nobody can flood a customer with mails.
 */
export async function requestReturnLink(input: ReturnLookupInput) {
  try {
    await assertRateLimitFor("returnLookupOrder", input.orderNumber);
  } catch (error) {
    if (error instanceof RateLimitError) return;
    throw error;
  }
  const order = await prisma.order.findUnique({
    where: { number: input.orderNumber },
    select: { id: true, number: true, firstName: true, email: true, locale: true, status: true },
  });
  if (!order || !order.email || !sameEmail(order.email, input.email) || !RETURN_ACCESS_ORDER_STATUSES.includes(order.status)) return;

  const token = createToken();
  const access = await prisma.returnAccess.create({
    data: { orderId: order.id, linkTokenHash: hashToken(token), linkExpiresAt: new Date(Date.now() + RETURN_LINK_TTL_MS) },
    select: { id: true },
  });
  const locale = toLocale(input.locale ?? order.locale);
  // The token travels in the fragment: browsers never send it to a server, so it stays out of logs and Referer headers.
  // It's only spent by the page's own POST, so mail scanners that open links don't use it up.
  const link = `${env.APP_URL}${localizedPath(RETURN_URL, locale)}#t=${token}`;
  const { company } = await getShopSettings();
  try {
    const mail = buildReturnLinkMail({ ...order, locale }, link, { company });
    await sendEmail({ to: order.email, ...mail, idempotencyKey: `return-link-${access.id}` });
  } catch (error) {
    console.error(`[returns] link for ${order.number} (${maskEmail(order.email)}) failed:`, error instanceof Error ? error.message : error);
  }
}

/** Spends a link: it works once, within its time. Gives back a session token for the cookie, and the order. */
export async function openReturnSession(token: string, locale: string | null) {
  const sessionToken = createToken();
  const now = new Date();
  const { count } = await prisma.returnAccess.updateMany({
    where: { linkTokenHash: hashToken(token), usedAt: null, linkExpiresAt: { gt: now } },
    data: { usedAt: now, sessionTokenHash: hashToken(sessionToken), sessionExpiresAt: new Date(now.getTime() + RETURN_SESSION_TTL_MS) },
  });
  if (count === 0) throw new ReturnAccessError();
  return { sessionToken, overview: await getReturnOverview(sessionToken, locale) };
}

/** The order a session cookie opens, or ReturnAccessError. */
async function orderIdForSession(sessionToken: string | null) {
  if (!sessionToken || sessionToken.length > 128) throw new ReturnAccessError();
  const access = await prisma.returnAccess.findUnique({
    where: { sessionTokenHash: hashToken(sessionToken) },
    select: { orderId: true, sessionExpiresAt: true, order: { select: { status: true } } },
  });
  if (!access?.sessionExpiresAt || access.sessionExpiresAt <= new Date()) throw new ReturnAccessError();
  if (!RETURN_ACCESS_ORDER_STATUSES.includes(access.order.status)) throw new ReturnAccessError();
  return access.orderId;
}

/** Cron: links and sessions that can't be used any more. */
export async function deleteExpiredReturnAccess() {
  const now = new Date();
  const { count } = await prisma.returnAccess.deleteMany({
    where: { linkExpiresAt: { lt: now }, OR: [{ sessionExpiresAt: null }, { sessionExpiresAt: { lt: now } }] },
  });
  return count;
}

// ---------- The order, as the customer sees it ----------

const ORDER_SELECT = {
  id: true,
  number: true,
  status: true,
  firstName: true,
  lastName: true,
  email: true,
  locale: true,
  reprintOfId: true,
  productionStartedAt: true,
  shipment: { select: { deliveryType: true, shippedAt: true, deliveredAt: true } },
  items: {
    orderBy: { position: "asc" },
    select: {
      id: true,
      title: true,
      animal: true,
      edition: true,
      attachment: true,
      quantity: true,
      cancelledQuantity: true,
      withdrawable: true,
      previewId: true,
      preview: { select: { poseImageKey: true, photos: { orderBy: { createdAt: "asc" }, take: 1, select: { key: true } } } },
      collectible: { select: { imageKey: true, translations: true } },
      returnItems: { select: { quantity: true, returnRequest: { select: { type: true, status: true } } } },
    },
  },
  returnRequests: {
    orderBy: { submittedAt: "desc" },
    select: {
      id: true,
      type: true,
      status: true,
      submittedAt: true,
      resolution: true,
      decisionNote: true,
      items: { select: { orderItemId: true, quantity: true } },
    },
  },
} as const satisfies Prisma.OrderSelect;

type ReturnOrderRow = Prisma.OrderGetPayload<{ select: typeof ORDER_SELECT }>;
type ReturnItemRow = ReturnOrderRow["items"][number];

const rulesOrder = (order: ReturnOrderRow) => ({
  status: order.status,
  productionStarted: order.productionStartedAt !== null,
  isReprint: order.reprintOfId !== null,
  shipment: order.shipment,
});
const requestLines = (item: ReturnItemRow) =>
  item.returnItems.map((line) => ({ type: line.returnRequest.type, status: line.returnRequest.status, quantity: line.quantity }));

function titles(order: ReturnOrderRow, locale: Locale, animals: AnimalOption[]) {
  return new Map(order.items.map((item) => [item.id, itemTitle(item, MESSAGES[locale], locale, animals)]));
}

async function itemImage(item: ReturnItemRow) {
  // The pose looks most like the Palley; the pet photos may already be deleted after shipping.
  const key = item.preview?.poseImageKey ?? item.preview?.photos[0]?.key;
  if (key) return createDownloadUrl(key);
  return collectibleImageUrl(item.collectible?.imageKey ?? null);
}

async function loadOrder(client: Prisma.TransactionClient | typeof prisma, orderId: string) {
  const order = await client.order.findUnique({ where: { id: orderId }, select: ORDER_SELECT });
  if (!order || !RETURN_ACCESS_ORDER_STATUSES.includes(order.status)) throw new ReturnAccessError();
  return order;
}

export async function getReturnOverview(sessionToken: string | null, localeValue: string | null): Promise<ReturnOverview> {
  const locale = toLocale(localeValue);
  const orderId = await orderIdForSession(sessionToken);
  const [order, { catalog, company }] = await Promise.all([loadOrder(prisma, orderId), getShopSettings()]);
  const today = brusselsDay(new Date());
  const names = titles(order, locale, catalog.animals);

  const items = await Promise.all(
    order.items.map(async (item) => {
      const requests = requestLines(item);
      return {
        id: item.id,
        kind: item.previewId ? ("personalized" as const) : ("collectible" as const),
        title: names.get(item.id)!,
        quantity: item.quantity,
        imageUrl: await itemImage(item),
        status: itemReturnStatus(rulesOrder(order), { ...item, requests }),
        options: itemReturnOptions(rulesOrder(order), { withdrawable: item.withdrawable, quantity: item.quantity, requests }, today),
      };
    }),
  );

  return {
    orderNumber: order.number,
    firstName: order.firstName,
    orderStatus: order.status,
    receivedOn: order.status === "SHIPPED" ? receivedOn(order.shipment) : null,
    items,
    requests: order.returnRequests.map((request) => ({
      id: request.id,
      type: request.type,
      status: request.status,
      submittedAt: request.submittedAt.toISOString(),
      items: request.items.map((line) => ({ title: names.get(line.orderItemId) ?? "", quantity: line.quantity })),
      resolution: request.resolution,
      decisionNote: request.status === "REJECTED" ? request.decisionNote : null,
    })),
    returnAddress: company.returnAddress,
    companyEmail: company.email,
  };
}

// ---------- Photos and sending a request ----------

const returnPhotoKey = (orderId: string, contentType: keyof typeof IMAGE_EXTENSIONS) =>
  `${RETURN_PHOTO_PREFIX}/${orderId}/${randomUUID()}.${IMAGE_EXTENSIONS[contentType]}`;

/** Signed upload URLs for a warranty claim's photos. They go straight from the browser to R2 and stay private. */
export async function createReturnPhotoUploads(sessionToken: string | null, input: ReturnPhotoUploadInput) {
  const orderId = await orderIdForSession(sessionToken);
  return Promise.all(
    input.photos.map(async (photo) => {
      const key = returnPhotoKey(orderId, photo.contentType);
      return { key, uploadUrl: await createUploadUrl(key, photo.contentType) };
    }),
  );
}

async function assertPhotosUploaded(orderId: string, keys: string[]) {
  if (keys.some((key) => !isReturnPhotoKeyOf(RETURN_PHOTO_PREFIX, orderId, key))) throw new ReturnPhotoError();
  const found = await Promise.all(keys.map(objectExists));
  if (found.includes(false)) throw new ReturnPhotoError();
}

/** Every line of the request is still allowed, with these quantities. Throws ReturnNotAllowedError otherwise. */
function checkRequest(order: ReturnOrderRow, input: ReturnSubmitInput, today: CalendarDay) {
  const options = input.items.map((line) => {
    const item = order.items.find((row) => row.id === line.orderItemId);
    if (!item) throw new ReturnNotAllowedError();
    const itemOptions = itemReturnOptions(rulesOrder(order), { withdrawable: item.withdrawable, quantity: item.quantity, requests: requestLines(item) }, today);
    if (line.quantity > allowedQuantity(itemOptions, input.type)) throw new ReturnNotAllowedError();
    return itemOptions;
  });
  return { itemsReceived: input.type === "WITHDRAWAL" && withdrawalNeedsReturn(options) };
}

export async function submitReturnRequest(sessionToken: string | null, input: ReturnSubmitInput, localeValue: string | null): Promise<ReturnReceipt> {
  const locale = toLocale(localeValue);
  const orderId = await orderIdForSession(sessionToken);
  const photoKeys = input.type === "WARRANTY" ? input.photoKeys : [];
  await assertPhotosUploaded(orderId, photoKeys);
  const { catalog, company } = await getShopSettings();

  const { receipt, order } = await prisma.$transaction(async (tx) => {
    // One request at a time per order: the check below and the insert see the same requests.
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const order = await loadOrder(tx, orderId);
    const now = new Date();
    const { itemsReceived } = checkRequest(order, input, brusselsDay(now));
    const resolution = input.type === "WARRANTY" ? input.resolution : null;

    const request = await tx.returnRequest.create({
      data: {
        orderId,
        type: input.type,
        resolution,
        reason: input.reason,
        photoKeys,
        itemsReceived,
        locale,
        submittedAt: now,
        items: { create: input.items.map((line) => ({ orderItemId: line.orderItemId, quantity: line.quantity })) },
      },
      select: { id: true },
    });
    const names = titles(order, locale, catalog.animals);
    const items = input.items.map((line) => ({ title: names.get(line.orderItemId)!, quantity: line.quantity }));
    await tx.orderStatusChange.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: order.status,
        source: CUSTOMER_SOURCE,
        note: `${typeLabel(input.type)} aangevraagd: ${items.map((item) => `${item.quantity} × ${item.title}`).join(", ")}`.slice(0, 1000),
      },
    });

    const receipt: ReturnReceipt = {
      id: request.id,
      type: input.type,
      submittedAt: now.toISOString(),
      items,
      reason: input.reason,
      resolution,
      itemsReceived,
      // LEGAL-REVIEW: "ten laatste 14 dagen nadat je herroepen hebt".
      returnBy: itemsReceived ? addDays(brusselsDay(now), WITHDRAWAL_DAYS) : null,
      returnAddress: company.returnAddress,
      photoCount: photoKeys.length,
    };
    return { receipt, order };
  });

  await flagOrder(orderId, attentionNote(receipt.id, typeLabel(receipt.type)));
  console.info(`[returns] ${receipt.type} for ${order.number}`);

  const adminUrl = `${env.APP_URL}/admin/orders/${orderId}`;
  await Promise.all([
    order.email && sendReturnMail(orderId, order.email, buildReturnReceiptMail({ ...order, locale }, receipt, { company }), `return-receipt-${receipt.id}`),
    sendReturnMail(orderId, company.email, buildReturnTeamMail(order, receipt, adminUrl), `return-team-${receipt.id}`, teamMailCc(company)),
  ]);
  return receipt;
}

/** A failed mail never undoes a request: it's logged and the order says so in the backoffice. */
async function sendReturnMail(
  orderId: string,
  to: string,
  mail: { subject: string; html: string; text: string },
  idempotencyKey: string,
  cc?: string[],
) {
  try {
    const sent = await sendEmail({ to, cc, ...mail, idempotencyKey });
    if (!sent) console.warn(`[returns] ${idempotencyKey} not sent: e-mail is not configured`);
  } catch (error) {
    console.error(`[returns] ${idempotencyKey} to ${maskEmail(to)} failed:`, error instanceof Error ? error.message : error);
    const detail = error instanceof EmailError ? error.detail : null;
    await flagOrder(orderId, `Retourmail kon niet verstuurd worden${detail ? ` (Resend: ${detail})` : ""}`);
  }
}

// ---------- Backoffice ----------

const ADMIN_SELECT = {
  id: true,
  orderId: true,
  type: true,
  status: true,
  resolution: true,
  reason: true,
  photoKeys: true,
  itemsReceived: true,
  submittedAt: true,
  decidedAt: true,
  decidedBy: true,
  completedAt: true,
  completedBy: true,
  decisionNote: true,
  order: { select: { number: true, firstName: true, lastName: true } },
  items: { select: { orderItemId: true, quantity: true, orderItem: { select: { title: true, productCode: true, position: true } } } },
  reprintOrder: { select: { id: true, number: true } },
} as const satisfies Prisma.ReturnRequestSelect;

type AdminRow = Prisma.ReturnRequestGetPayload<{ select: typeof ADMIN_SELECT }>;
const iso = (date: Date | null) => date?.toISOString() ?? null;

async function toAdminView(row: AdminRow): Promise<AdminReturnRequest> {
  return {
    id: row.id,
    orderId: row.orderId,
    orderNumber: row.order.number,
    customerName: `${row.order.firstName} ${row.order.lastName}`,
    type: row.type,
    status: row.status,
    resolution: row.resolution,
    reason: row.reason,
    itemsReceived: row.itemsReceived,
    submittedAt: row.submittedAt.toISOString(),
    decidedAt: iso(row.decidedAt),
    decidedBy: row.decidedBy,
    completedAt: iso(row.completedAt),
    completedBy: row.completedBy,
    decisionNote: row.decisionNote,
    items: [...row.items]
      .sort((a, b) => a.orderItem.position - b.orderItem.position)
      .map((line) => ({ orderItemId: line.orderItemId, title: line.orderItem.title, productCode: line.orderItem.productCode, quantity: line.quantity })),
    photoUrls: await Promise.all(row.photoKeys.map((key) => createDownloadUrl(key))),
    reprintOrder: row.reprintOrder,
  };
}

/** The requests the team still has to handle (oldest first), or all of them (newest first). */
export async function listReturnRequests({ open }: { open: boolean }) {
  const rows = await prisma.returnRequest.findMany({
    where: open ? { status: { in: OPEN_RETURN_STATUSES } } : {},
    orderBy: { submittedAt: open ? "asc" : "desc" },
    take: 100,
    select: ADMIN_SELECT,
  });
  return Promise.all(rows.map(toAdminView));
}

export async function getReturnRequestsForOrder(orderId: string) {
  const rows = await prisma.returnRequest.findMany({ where: { orderId }, orderBy: { submittedAt: "desc" }, select: ADMIN_SELECT });
  return Promise.all(rows.map(toAdminView));
}

export const countOpenReturnRequests = () => prisma.returnRequest.count({ where: { status: { in: OPEN_RETURN_STATUSES } } });

const DECISION_STATUS: Record<ReturnDecisionInput["action"], ReturnStatus> = {
  approve: "APPROVED",
  reject: "REJECTED",
  complete: "COMPLETED",
};

/**
 * Approve, reject or complete a request. Approving a cancellation or an early withdrawal takes those copies out of
 * production (OrderItem.cancelledQuantity); approving a reprint makes a € 0 order for the next batch. Every step goes in
 * the order's status log; the attention flag goes once the request is closed. The customer gets a mail on approve and
 * reject. Refunding stays a manual step in the Bancontact Pro portal.
 */
export async function decideReturnRequest(id: string, input: ReturnDecisionInput, adminName: string) {
  const request = await prisma.returnRequest.findUnique({
    where: { id },
    select: {
      id: true,
      orderId: true,
      type: true,
      status: true,
      resolution: true,
      itemsReceived: true,
      locale: true,
      items: { select: { orderItemId: true, quantity: true } },
      order: { select: { number: true, firstName: true, email: true } },
    },
  });
  if (!request) throw new ReturnNotFoundError(id);
  const to = DECISION_STATUS[input.action];
  if (!canTransitionReturn(request.status, to)) throw new ReturnActionError("Deze stap kan niet vanuit de huidige status");
  const decisionNote = input.action === "reject" ? input.note : null;

  const reprint = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const stamp =
      to === "COMPLETED" ? { completedAt: now, completedBy: adminName } : { decidedAt: now, decidedBy: adminName, decisionNote };
    const { count } = await tx.returnRequest.updateMany({ where: { id, status: request.status }, data: { status: to, ...stamp } });
    if (count === 0) throw new ReturnActionError("Deze aanvraag werd intussen al afgehandeld");

    const notes = [`${typeLabel(request.type)} ${MESSAGES.nl.returns.overview.requestStatuses[to].toLowerCase()}`];
    let reprint: { id: string; number: string } | null = null;
    if (to === "APPROVED" && cancelsProduction(request.type, request.itemsReceived)) {
      notes.push(await cancelItems(tx, request.orderId, request.items));
    }
    if (to === "APPROVED" && request.type === "WARRANTY" && request.resolution === "REPRINT") {
      reprint = await createReprintOrder(tx, request.orderId, request.items, adminName);
      await tx.returnRequest.update({ where: { id }, data: { reprintOrderId: reprint.id } });
      notes.push(`herprint in ${reprint.number}`);
    }
    if (decisionNote) notes.push(`reden: ${decisionNote}`);

    const order = await tx.order.findUniqueOrThrow({ where: { id: request.orderId }, select: { status: true, attentionReason: true } });
    await tx.orderStatusChange.create({
      data: { orderId: request.orderId, fromStatus: order.status, toStatus: order.status, source: adminSource(adminName), note: notes.join(", ").slice(0, 1000) },
    });
    if (to !== "APPROVED") {
      const reason = withoutAttentionNote(order.attentionReason, attentionNote(id, typeLabel(request.type)));
      await tx.order.update({ where: { id: request.orderId }, data: { attentionReason: reason } });
    }
    return reprint;
  });

  if (to !== "COMPLETED" && request.order.email) {
    const { company } = await getShopSettings();
    const mail = buildReturnDecisionMail(
      to === "APPROVED" ? "approved" : "rejected",
      { ...request.order, locale: request.locale },
      { ...request, decisionNote },
      { company, returnAddress: company.returnAddress },
    );
    await sendReturnMail(request.orderId, request.order.email, mail, `return-${input.action}-${id}`);
  }
  return { id, status: to, reprintOrder: reprint };
}

type RequestLine = { orderItemId: string; quantity: number };

/** Takes the copies out of production. An order with nothing left to make leaves a batch that hasn't gone to JLC. */
async function cancelItems(tx: Prisma.TransactionClient, orderId: string, lines: RequestLine[]) {
  for (const line of lines) {
    await tx.orderItem.update({ where: { id: line.orderItemId }, data: { cancelledQuantity: { increment: line.quantity } } });
  }
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { items: { select: { quantity: true, cancelledQuantity: true } }, batch: { select: { number: true, status: true } } },
  });
  const nothingLeft = order.items.every((item) => activeQuantity(item) <= 0);
  if (nothingLeft && order.batch?.status === "OPEN") {
    await tx.order.update({ where: { id: orderId }, data: { batchId: null } });
    return `alles geannuleerd, uit ${batchRef(order.batch.number)} gehaald: terugbetalen via Bancontact Pro`;
  }
  return nothingLeft ? "alles geannuleerd: terugbetalen via Bancontact Pro" : "niet meer maken";
}

/**
 * A reprint is an order of its own, so it goes through batches, check-in and shipping like any other: paid at € 0, no
 * invoice, no confirmation mail. Its lines keep the original position and product code with the next -R<n>, and point
 * at the same preview or collectible, so the print file is the one made the first time.
 */
async function createReprintOrder(tx: Prisma.TransactionClient, orderId: string, lines: RequestLine[], adminName: string) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      id: true,
      number: true,
      reprintOfId: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      street: true,
      houseNumber: true,
      postalCode: true,
      city: true,
      country: true,
      currency: true,
      locale: true,
      shipment: { select: { provider: true, deliveryOptionId: true, deliveryType: true, carrier: true, label: true } },
      items: {
        select: {
          id: true,
          position: true,
          previewId: true,
          collectibleId: true,
          productCode: true,
          size: true,
          edition: true,
          attachment: true,
          animal: true,
          title: true,
          notes: true,
          withdrawable: true,
        },
      },
    },
  });
  // A reprint of a reprint still belongs to the first order: that's the name on the Palley.
  const rootId = order.reprintOfId ?? order.id;
  const printed = await tx.orderItem.findMany({
    where: { OR: [{ orderId: rootId }, { order: { reprintOfId: rootId } }] },
    select: { position: true, reprintNr: true },
  });
  const nextReprintNr = (position: number) =>
    Math.max(0, ...printed.filter((item) => item.position === position).map((item) => item.reprintNr)) + 1;

  const items = lines.map((line) => {
    const { id: _id, ...item } = order.items.find((row) => row.id === line.orderItemId)!;
    void _id;
    return { ...item, quantity: line.quantity, unitCents: 0, reprintNr: nextReprintNr(item.position) };
  });
  const now = new Date();
  return tx.order.create({
    data: {
      number: await nextOrderNumber(tx),
      status: "PAID",
      paidAt: now,
      createdBy: adminName,
      reprintOfId: rootId,
      email: order.email,
      firstName: order.firstName,
      lastName: order.lastName,
      phone: order.phone,
      street: order.street,
      houseNumber: order.houseNumber,
      postalCode: order.postalCode,
      city: order.city,
      country: order.country,
      currency: order.currency,
      locale: order.locale,
      subtotalCents: 0,
      shippingCents: 0,
      vatCents: 0,
      totalCents: 0,
      statusTokenHash: hashToken(createToken()),
      items: { create: items },
      shipment: order.shipment ? { create: { ...order.shipment, priceCents: 0 } } : undefined,
      statusChanges: {
        create: { fromStatus: null, toStatus: "PAID", source: adminSource(adminName), note: `Herprint van ${order.number} (garantieclaim)` },
      },
    },
    select: { id: true, number: true },
  });
}

/** The day a parcel really arrived, from the team; null goes back to the estimate. Starts the withdrawal period. */
export async function setDeliveredOn(orderId: string, day: CalendarDay | null, adminName: string) {
  if (day && day > brusselsDay(new Date())) throw new ReturnActionError("Die datum ligt in de toekomst");
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true, shipment: { select: { id: true } } } });
  if (!order?.shipment) throw new ReturnNotFoundError(orderId);
  // Noon UTC is the same calendar day in Brussels, summer and winter.
  const deliveredAt = day ? new Date(`${day}T12:00:00Z`) : null;
  await prisma.$transaction([
    prisma.shipment.update({ where: { orderId }, data: { deliveredAt } }),
    prisma.orderStatusChange.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: order.status,
        source: adminSource(adminName),
        note: day ? `Ontvangen door de klant op ${day}` : "Ontvangstdatum gewist: geschat uit de verzenddatum",
      },
    }),
  ]);
  return { orderId, deliveredOn: day };
}
