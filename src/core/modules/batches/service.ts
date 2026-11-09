import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/db/client";
import type { Prisma } from "@/db/generated/client";
import type { BatchStatus } from "@/db/generated/enums";
import { nextCounterValue } from "@/db/counters";
import { createDownloadUrl, objectExists } from "@/core/networking/external/storage-client";
import { EmailError, sendEmail } from "@/core/networking/external/email-client";
import { batchRef, batchZipName } from "@/core/utils/naming";
import { palleyNameOf } from "@/core/modules/orders/utils";
import { allItemsCheckedIn, checkInItemOf, OPEN_ORDER_STATUSES } from "@/core/modules/orders/check-in";
import { buildPickupMail } from "@/core/modules/orders/emails";
import { updateOrderStatus } from "@/core/modules/orders/admin";
import { moveOrder } from "@/core/modules/payments/service";
import { getShopSettings } from "@/core/modules/settings/service";
import { collectibleImageUrl } from "@/core/modules/collectibles/utils";
import { buildBpostCsv } from "@/core/modules/shipping/bpost/csv";
import { FINISHED_PAGE_SIZE } from "@/data/batches";
import { toLocale } from "@/core/locale/config";
import { zipSync } from "fflate";
import { BATCHABLE_ORDER_STATUS, isBatchEditable } from "./status";
import { batchContents, deliveryGroup, isItemPrintReady, isOrderPrintReady } from "./utils";
import { completeBatchIfDone } from "./sync";
import type {
  BatchesPage,
  BatchOrderView,
  BatchView,
  FinishedOrdersPage,
  ProductionBatchView,
  ProductionPage,
} from "./types";

/*
 * Print batches for JLC and what follows them (Batches and Productie in the backoffice). A batch bundles whole,
 * print-ready, paid orders; sending it to JLC puts them IN_PRODUCTION, and from post-production each order leaves by
 * bpost or is picked up / handed over, which is SHIPPED either way. Order moves always go through moveOrder or
 * updateOrderStatus, so the order log and the payment rules stay where they are.
 */

export class BatchNotFoundError extends Error {}
/** A refusal the admin can act on; the message is shown as it is. */
export class BatchActionError extends Error {}
/** Some Palleys have no print file: the zip is refused rather than sent half. */
export class BatchFilesMissingError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Missing print files: ${missing.join(", ")}`);
  }
}

const BATCH_COUNTER_KEY = "batch";
const SOURCE = (adminName: string) => `admin:${adminName}` as const;

// ---------- Reading ----------

const ITEM_SELECT = {
  id: true,
  position: true,
  productCode: true,
  reprintNr: true,
  quantity: true,
  cancelledQuantity: true,
  size: true,
  title: true,
  checkedInAt: true,
  checkedInBy: true,
  preview: { select: { status: true, processedKey: true, poseImageKey: true } },
  collectible: { select: { modelKey: true, imageKey: true } },
} as const satisfies Prisma.OrderItemSelect;

const ORDER_SELECT = {
  id: true,
  number: true,
  status: true,
  paidAt: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  street: true,
  houseNumber: true,
  postalCode: true,
  city: true,
  country: true,
  locale: true,
  attentionReason: true,
  reprintOf: { select: { number: true } },
  shipment: {
    select: { deliveryType: true, label: true, shippedAt: true, trackingCode: true, trackingUrl: true, readyForPickupAt: true, lastPickupUpdateAt: true },
  },
  items: { orderBy: { position: "asc" }, select: ITEM_SELECT },
} as const satisfies Prisma.OrderSelect;

type OrderRow = Prisma.OrderGetPayload<{ select: typeof ORDER_SELECT }>;

const BATCH_INCLUDE = { orders: { orderBy: { number: "asc" }, select: ORDER_SELECT } } as const satisfies Prisma.BatchInclude;
type BatchRow = Prisma.BatchGetPayload<{ include: typeof BATCH_INCLUDE }>;

const iso = (date: Date | null | undefined) => date?.toISOString() ?? null;

async function toOrderView(order: OrderRow): Promise<BatchOrderView> {
  const items = await Promise.all(
    order.items.map(async (item) => ({
      id: item.id,
      kind: item.preview ? ("personalized" as const) : ("collectible" as const),
      title: item.title,
      palleyName: palleyNameOf({ ...item, order }),
      productCode: item.productCode,
      quantity: item.quantity,
      thumbnailUrl: item.preview?.poseImageKey
        ? await createDownloadUrl(item.preview.poseImageKey)
        : collectibleImageUrl(item.collectible?.imageKey ?? null),
      printReady: isItemPrintReady(item),
      checkedInAt: iso(item.checkedInAt),
      checkedInBy: item.checkedInBy,
    })),
  );
  const deliveryType = order.shipment?.deliveryType ?? null;
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    paidAt: iso(order.paidAt),
    customerName: `${order.firstName} ${order.lastName}`,
    email: order.email,
    phone: order.phone,
    address: order.street ? `${order.street} ${order.houseNumber ?? ""}, ${order.postalCode} ${order.city}` : null,
    deliveryType,
    deliveryLabel: order.shipment?.label ?? null,
    group: deliveryGroup(deliveryType),
    shippedAt: iso(order.shipment?.shippedAt),
    trackingCode: order.shipment?.trackingCode ?? null,
    readyForPickupAt: iso(order.shipment?.readyForPickupAt),
    lastPickupUpdateAt: iso(order.shipment?.lastPickupUpdateAt),
    attentionReason: order.attentionReason,
    allCheckedIn: allItemsCheckedIn(order.items.map(checkInItemOf)),
    items,
  };
}

async function toBatchView(batch: BatchRow): Promise<BatchView> {
  const orders = await Promise.all(batch.orders.map(toOrderView));
  const items = batch.orders.flatMap((order) => order.items);
  return {
    id: batch.id,
    ref: batchRef(batch.number),
    status: batch.status,
    createdAt: batch.createdAt.toISOString(),
    createdBy: batch.createdBy,
    sentToJlcAt: iso(batch.sentToJlcAt),
    sentToJlcBy: batch.sentToJlcBy,
    receivedAt: iso(batch.receivedAt),
    receivedBy: batch.receivedBy,
    completedAt: iso(batch.completedAt),
    counts: { orders: orders.length, palleys: items.length, copies: items.reduce((sum, item) => sum + item.quantity, 0) },
    orders,
  };
}

async function listBatches(status: BatchStatus) {
  const rows = await prisma.batch.findMany({ where: { status }, orderBy: { number: "asc" }, include: BATCH_INCLUDE });
  return Promise.all(rows.map(toBatchView));
}

/** Everything for the Batches page: orders ready for a batch, and the batches still to go to JLC. */
export async function getBatchesPage(): Promise<BatchesPage> {
  const [candidates, openBatches] = await Promise.all([
    prisma.order.findMany({ where: { status: BATCHABLE_ORDER_STATUS, batchId: null }, orderBy: { number: "asc" }, select: ORDER_SELECT }),
    listBatches("OPEN"),
  ]);
  const ready = candidates.filter((order) => isOrderPrintReady(order.items));
  return { ready: await Promise.all(ready.map(toOrderView)), waiting: candidates.length - ready.length, openBatches };
}

/** Everything for the Productie page: at JLC, in post-production (split per delivery), and who still has to pick up. */
export async function getProductionPage(): Promise<ProductionPage> {
  const [sent, inPost, waiting] = await Promise.all([
    listBatches("SENT_TO_JLC"),
    prisma.batch.findMany({ where: { status: "IN_POST_PRODUCTION" }, orderBy: { number: "asc" }, include: BATCH_INCLUDE }),
    prisma.order.findMany({
      where: { status: { in: OPEN_ORDER_STATUSES }, shipment: { deliveryType: "PICKUP", readyForPickupAt: { not: null } } },
      orderBy: { number: "asc" },
      select: { id: true, number: true, firstName: true, lastName: true, locale: true, shipment: { select: { readyForPickupAt: true, lastPickupUpdateAt: true } } },
    }),
  ]);
  const postProduction: ProductionBatchView[] = await Promise.all(
    inPost.map(async (batch) => {
      const view = await toBatchView(batch);
      const bpost = buildBpostCsv(view.ref, bpostOrders(batch));
      return { ...view, bpostProblems: bpost.problems, bpostLabels: bpost.exported.length };
    }),
  );
  return {
    sent,
    postProduction,
    waitingForPickup: waiting.map((order) => ({
      id: order.id,
      number: order.number,
      customerName: `${order.firstName} ${order.lastName}`,
      locale: order.locale,
      readyForPickupAt: order.shipment!.readyForPickupAt!.toISOString(),
      lastPickupUpdateAt: iso(order.shipment?.lastPickupUpdateAt),
    })),
  };
}

/** Finished orders, newest first: delivered by bpost, or picked up / handed over. */
export async function listFinishedOrders(tab: "delivered" | "collected", page: number): Promise<FinishedOrdersPage> {
  const where: Prisma.OrderWhereInput = {
    status: "SHIPPED",
    shipment: tab === "delivered" ? { deliveryType: "HOME" } : { deliveryType: { in: ["PICKUP", "HANDOVER"] } },
  };
  const [count, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: [{ shipment: { shippedAt: { sort: "desc", nulls: "last" } } }, { number: "desc" }],
      skip: (page - 1) * FINISHED_PAGE_SIZE,
      take: FINISHED_PAGE_SIZE,
      select: {
        id: true,
        number: true,
        firstName: true,
        lastName: true,
        batch: { select: { number: true } },
        shipment: { select: { deliveryType: true, shippedAt: true, trackingCode: true, trackingUrl: true, readyForPickupAt: true } },
      },
    }),
  ]);
  return {
    tab,
    page,
    pageCount: Math.max(1, Math.ceil(count / FINISHED_PAGE_SIZE)),
    orders: rows.map((order) => ({
      id: order.id,
      number: order.number,
      customerName: `${order.firstName} ${order.lastName}`,
      batchRef: order.batch ? batchRef(order.batch.number) : null,
      deliveryType: order.shipment?.deliveryType ?? null,
      shippedAt: iso(order.shipment?.shippedAt),
      trackingCode: order.shipment?.trackingCode ?? null,
      trackingUrl: order.shipment?.trackingUrl ?? null,
      readyForPickupAt: iso(order.shipment?.readyForPickupAt),
    })),
  };
}

// ---------- Building a batch ----------

type Tx = Prisma.TransactionClient;

async function findBatch(tx: Tx, batchId: string) {
  const batch = await tx.batch.findUnique({ where: { id: batchId }, select: { id: true, number: true, status: true } });
  if (!batch) throw new BatchNotFoundError(batchId);
  return batch;
}

/** Puts orders in a batch, all or none: each must be paid, print-ready and in no batch yet. */
async function claimOrders(tx: Tx, batch: { id: string; number: number }, orderIds: string[], adminName: string) {
  const ids = [...new Set(orderIds)];
  const orders = await tx.order.findMany({
    where: { id: { in: ids } },
    select: { id: true, number: true, status: true, batchId: true, items: { select: ITEM_SELECT } },
  });
  if (orders.length !== ids.length) throw new BatchActionError("Een van de orders bestaat niet meer");
  for (const order of orders) {
    if (order.batchId) throw new BatchActionError(`${order.number} zit al in een batch`);
    if (order.status !== BATCHABLE_ORDER_STATUS) throw new BatchActionError(`${order.number} is niet (meer) betaald en open`);
    if (!isOrderPrintReady(order.items)) throw new BatchActionError(`${order.number} is nog niet volledig printklaar`);
  }
  // The conditions again in the update itself: of two admins taking the same order at once, one gets it.
  const { count } = await tx.order.updateMany({
    where: { id: { in: ids }, batchId: null, status: BATCHABLE_ORDER_STATUS },
    data: { batchId: batch.id },
  });
  if (count !== ids.length) throw new BatchActionError("Een order is intussen gewijzigd of al in een andere batch gezet");
  await tx.orderStatusChange.createMany({
    data: orders.map((order) => ({
      orderId: order.id,
      fromStatus: order.status,
      toStatus: order.status,
      source: SOURCE(adminName),
      note: `In ${batchRef(batch.number)} gezet`,
    })),
  });
}

export async function createBatch(orderIds: string[], adminName: string) {
  return prisma.$transaction(async (tx) => {
    const number = await nextCounterValue(tx, BATCH_COUNTER_KEY);
    const batch = await tx.batch.create({ data: { number, createdBy: adminName }, select: { id: true, number: true } });
    await tx.batchStatusChange.create({ data: { batchId: batch.id, fromStatus: null, toStatus: "OPEN", source: SOURCE(adminName) } });
    await claimOrders(tx, batch, orderIds, adminName);
    return { batchId: batch.id, ref: batchRef(batch.number) };
  });
}

export async function addOrdersToBatch(batchId: string, orderIds: string[], adminName: string) {
  return prisma.$transaction(async (tx) => {
    const batch = await findBatch(tx, batchId);
    if (!isBatchEditable(batch.status)) throw new BatchActionError("Deze batch is al naar JLC: er kan niets meer bij");
    await claimOrders(tx, batch, orderIds, adminName);
    return { batchId };
  });
}

export async function removeOrderFromBatch(batchId: string, orderId: string, adminName: string) {
  return prisma.$transaction(async (tx) => {
    const batch = await findBatch(tx, batchId);
    if (!isBatchEditable(batch.status)) throw new BatchActionError("Deze batch is al naar JLC: er kan niets meer uit");
    const order = await tx.order.findFirst({ where: { id: orderId, batchId }, select: { status: true } });
    if (!order) throw new BatchActionError("Deze order zit niet in deze batch");
    await tx.order.update({ where: { id: orderId }, data: { batchId: null } });
    await tx.orderStatusChange.create({
      data: { orderId, fromStatus: order.status, toStatus: order.status, source: SOURCE(adminName), note: `Uit ${batchRef(batch.number)} gehaald` },
    });
    return { batchId, orderId };
  });
}

/** Only an empty batch that hasn't gone to JLC. Its number is never handed out again. */
export async function deleteBatch(batchId: string) {
  return prisma.$transaction(async (tx) => {
    const batch = await findBatch(tx, batchId);
    if (!isBatchEditable(batch.status)) throw new BatchActionError("Een batch die al naar JLC is, blijft bestaan");
    if ((await tx.order.count({ where: { batchId } })) > 0) throw new BatchActionError("Haal eerst alle orders uit de batch");
    await tx.batch.delete({ where: { id: batchId } });
    return { batchId };
  });
}

/** Moves a batch one step, with a log row. Returns false when it wasn't in `from` anymore. */
async function moveBatch(batchId: string, from: BatchStatus, to: BatchStatus, adminName: string, data: Prisma.BatchUpdateManyMutationInput) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.batch.updateMany({ where: { id: batchId, status: from }, data: { status: to, ...data } });
    if (count === 0) return false;
    await tx.batchStatusChange.create({ data: { batchId, fromStatus: from, toStatus: to, source: SOURCE(adminName) } });
    return true;
  });
}

/** The files went to JLC: the batch is fixed and every order goes IN_PRODUCTION. */
export async function sendBatchToJlc(batchId: string, adminName: string) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId }, include: BATCH_INCLUDE });
  if (!batch) throw new BatchNotFoundError(batchId);
  if (batch.status !== "OPEN") throw new BatchActionError("Deze batch is al naar JLC");
  if (batch.orders.length === 0) throw new BatchActionError("Een lege batch kan niet naar JLC");
  const notReady = batch.orders.filter((order) => order.status !== BATCHABLE_ORDER_STATUS || !isOrderPrintReady(order.items));
  if (notReady.length > 0) {
    throw new BatchActionError(`Niet (meer) klaar voor print: ${notReady.map((order) => order.number).join(", ")}. Haal ze eerst uit de batch.`);
  }
  if (!(await moveBatch(batchId, "OPEN", "SENT_TO_JLC", adminName, { sentToJlcAt: new Date(), sentToJlcBy: adminName }))) {
    throw new BatchActionError("Deze batch is intussen al naar JLC");
  }
  const ref = batchRef(batch.number);
  const notMoved: string[] = [];
  for (const order of batch.orders) {
    if (!(await moveOrder(order.id, "IN_PRODUCTION", SOURCE(adminName), `${ref} verzonden naar JLC`))) notMoved.push(order.number);
  }
  if (notMoved.length > 0) console.warn(`[batches] ${ref}: not moved to IN_PRODUCTION: ${notMoved.join(", ")}`);
  return { batchId, notMoved };
}

/** The prints came back: post-production (check-in, then delivery or pickup) can start. */
export async function markBatchReceived(batchId: string, adminName: string) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId }, select: { status: true } });
  if (!batch) throw new BatchNotFoundError(batchId);
  if (!(await moveBatch(batchId, "SENT_TO_JLC", "IN_POST_PRODUCTION", adminName, { receivedAt: new Date(), receivedBy: adminName }))) {
    throw new BatchActionError("Deze batch is niet (meer) bij JLC");
  }
  return { batchId };
}

// ---------- Files ----------

async function batchFileRows(batchId: string) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId }, include: BATCH_INCLUDE });
  if (!batch) throw new BatchNotFoundError(batchId);
  return batch;
}

/**
 * What goes in the batch zip, after checking every print file is really in R2. Throws BatchFilesMissingError with
 * the Palleys that have none, so a zip is never started half.
 */
export async function prepareBatchZip(batchId: string) {
  const batch = await batchFileRows(batchId);
  const ref = batchRef(batch.number);
  const contents = batchContents(ref, batch.orders);
  const present = await Promise.all(contents.entries.map((entry) => objectExists(entry.key)));
  const missing = [...contents.missing, ...contents.entries.filter((_, index) => !present[index]).map((entry) => entry.palleyName)];
  if (missing.length > 0) throw new BatchFilesMissingError(missing);
  return { ref, fileName: batchZipName(ref), entries: contents.entries, manifest: contents.manifest };
}

function bpostOrders(batch: BatchRow) {
  return batch.orders
    .filter((order) => deliveryGroup(order.shipment?.deliveryType) === "deliver")
    .map((order) => ({ ...order, deliveryType: order.shipment?.deliveryType ?? null }));
}

/** The bpost CSV for the batch's home deliveries: one file, or a zip when there are more than 50 labels. */
export async function buildBatchBpostFile(batchId: string) {
  const batch = await batchFileRows(batchId);
  if (batch.status !== "IN_POST_PRODUCTION") throw new BatchActionError("De bpost-CSV hoort bij een batch in postproductie");
  const ref = batchRef(batch.number);
  const result = buildBpostCsv(ref, bpostOrders(batch));
  if (result.files.length === 0) throw new BatchActionError("Geen leveringen om te exporteren");
  if (result.files.length === 1) {
    const [file] = result.files;
    return { fileName: file.name, contentType: "text/csv", bytes: file.bytes, problems: result.problems };
  }
  const zip = zipSync(Object.fromEntries(result.files.map((file) => [file.name, file.bytes])));
  return { fileName: `BPOST-${batchZipName(ref)}`, contentType: "application/zip", bytes: zip, problems: result.problems };
}

// ---------- Leaving ----------

/** Every home delivery of the batch that is fully checked in goes to SHIPPED; the rest is listed. */
export async function shipAllDeliveries(batchId: string, adminName: string) {
  const batch = await batchFileRows(batchId);
  if (batch.status !== "IN_POST_PRODUCTION") throw new BatchActionError("Verzenden kan pas als de batch terug is van JLC");
  const shipped: string[] = [];
  const blocked: string[] = [];
  for (const order of batch.orders) {
    if (deliveryGroup(order.shipment?.deliveryType) !== "deliver" || !OPEN_ORDER_STATUSES.includes(order.status)) continue;
    const checkedIn = allItemsCheckedIn(order.items.map(checkInItemOf));
    if (!checkedIn) {
      blocked.push(order.number);
      continue;
    }
    await updateOrderStatus(order.id, { status: "SHIPPED" }, adminName);
    shipped.push(order.number);
  }
  await completeBatchIfDone(batchId);
  return { shipped, blocked };
}

/**
 * A pickup order is checked in and lies ready: mark it and mail the customer, once. A failed mail undoes the mark,
 * so the button can simply be pressed again.
 */
export async function markReadyForPickup(orderId: string, adminName: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { ...ORDER_SELECT, batch: { select: { status: true } } },
  });
  if (!order) throw new BatchActionError("Deze order bestaat niet");
  if (order.shipment?.deliveryType !== "PICKUP") throw new BatchActionError("Alleen een afhaalorder kan klaargelegd worden");
  if (!OPEN_ORDER_STATUSES.includes(order.status)) throw new BatchActionError("Deze order is niet meer open");
  const items = order.items.map(checkInItemOf);
  if (!allItemsCheckedIn(items)) throw new BatchActionError("Vink eerst alle items af");

  const claimed = await prisma.shipment.updateMany({
    where: { orderId, readyForPickupAt: null },
    data: { readyForPickupAt: new Date(), readyForPickupBy: adminName },
  });
  if (claimed.count === 0) return { orderId, mailed: false, alreadyReady: true };

  let mailed = false;
  if (order.email) {
    try {
      const { company } = await getShopSettings();
      mailed = await sendEmail({ to: order.email, ...buildPickupMail("ready", order, { company }), idempotencyKey: `pickup-ready-${orderId}` });
    } catch (error) {
      await prisma.shipment.updateMany({ where: { orderId }, data: { readyForPickupAt: null, readyForPickupBy: null } });
      const detail = error instanceof EmailError ? error.detail : null;
      throw new BatchActionError(`De mail kon niet verstuurd worden${detail ? ` (${detail})` : ""}: probeer opnieuw`);
    }
  }
  await prisma.orderStatusChange.create({
    data: {
      orderId,
      fromStatus: order.status,
      toStatus: order.status,
      source: SOURCE(adminName),
      note: mailed ? "Klaar om af te halen, klant gemaild" : "Klaar om af te halen (geen mail verstuurd)",
    },
  });
  return { orderId, mailed, alreadyReady: false };
}

/**
 * A message to everyone whose pickup order lies ready, about when they can come: as often as needed. Each customer
 * gets it in their order's language; the English text is required when someone ordered in English.
 */
export async function sendPickupUpdate(message: { nl: string; en?: string }, adminName: string) {
  const orders = await prisma.order.findMany({
    where: { status: { in: OPEN_ORDER_STATUSES }, email: { not: null }, shipment: { deliveryType: "PICKUP", readyForPickupAt: { not: null } } },
    select: { id: true, number: true, firstName: true, email: true, locale: true, status: true },
  });
  if (orders.length === 0) throw new BatchActionError("Niemand wacht op dit moment om af te halen");
  if (!message.en && orders.some((order) => toLocale(order.locale) === "en")) {
    throw new BatchActionError("Iemand bestelde in het Engels: vul ook de Engelse tekst in");
  }

  const { company } = await getShopSettings();
  const updateId = randomUUID();
  const sent: string[] = [];
  const failed: string[] = [];
  for (const order of orders) {
    const text = toLocale(order.locale) === "en" ? message.en! : message.nl;
    try {
      const ok = await sendEmail({
        to: order.email!,
        ...buildPickupMail("update", order, { company, message: text }),
        idempotencyKey: `pickup-update-${updateId}-${order.id}`,
      });
      if (!ok) throw new Error("e-mail is not configured");
      sent.push(order.number);
    } catch (error) {
      console.error(`[batches] pickup update for ${order.number} failed:`, error instanceof Error ? error.message : error);
      failed.push(order.number);
    }
  }
  const sentIds = orders.filter((order) => sent.includes(order.number));
  if (sentIds.length > 0) {
    await prisma.$transaction([
      prisma.shipment.updateMany({ where: { orderId: { in: sentIds.map((order) => order.id) } }, data: { lastPickupUpdateAt: new Date() } }),
      prisma.orderStatusChange.createMany({
        data: sentIds.map((order) => ({
          orderId: order.id,
          fromStatus: order.status,
          toStatus: order.status,
          source: SOURCE(adminName),
          note: `Afhaalupdate verstuurd: ${(toLocale(order.locale) === "en" ? message.en! : message.nl).slice(0, 200)}`,
        })),
      }),
    ]);
  }
  return { sent, failed };
}

