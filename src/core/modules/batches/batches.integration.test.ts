import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { unzipSync, strFromU8 } from "fflate";

/*
 * Batches and Productie over our own code, against the local database, with R2 and Resend mocked: from print-ready
 * paid orders to a batch at JLC, post-production, and delivery or pickup. Only the orders made here are looked at.
 */

const storage = vi.hoisted(() => ({ missing: new Set<string>() }));

vi.mock("@/core/networking/external/storage-client", () => ({
  objectExists: async (key: string) => !storage.missing.has(key),
  createDownloadUrl: async (key: string) => `https://r2.test/${key}`,
  // Every print file holds its own key, in two chunks, so the zip shows what came from where.
  getObjectStream: async (key: string) =>
    (async function* () {
      yield new TextEncoder().encode(`${key}:`);
      yield new TextEncoder().encode("end");
    })(),
}));

const mail = vi.hoisted(() => ({ sent: [] as { to: string; subject: string; text: string; idempotencyKey: string }[], fail: false }));

vi.mock("@/core/networking/external/email-client", () => ({
  isEmailConfigured: () => true,
  EmailError: class extends Error {
    detail = null;
  },
  sendEmail: async (input: { to: string; subject: string; text: string; idempotencyKey: string }) => {
    if (mail.fail) throw new Error("Resend is down");
    mail.sent.push(input);
    return true;
  },
}));

const { prisma } = await import("@/db/client");
const { nextOrderNumber } = await import("@/core/modules/orders/service");
const { setItemCheckIn, updateOrderStatus } = await import("@/core/modules/orders/admin");
const { moveOrder } = await import("@/core/modules/payments/service");
const service = await import("./service");
const { batchZipChunks } = await import("./zip");

const ADMIN = "Testadmin";
const orderIds: string[] = [];
const previewIds: string[] = [];
const collectibleIds: string[] = [];
const batchIds: string[] = [];

afterAll(async () => {
  await prisma.orderStatusChange.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.shipment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.batch.deleteMany({ where: { id: { in: batchIds } } });
  await prisma.preview.deleteMany({ where: { id: { in: previewIds } } });
  await prisma.collectible.deleteMany({ where: { id: { in: collectibleIds } } });
  await prisma.$disconnect();
});

beforeEach(() => {
  mail.sent = [];
  mail.fail = false;
  storage.missing.clear();
});

type Delivery = "HOME" | "PICKUP" | "HANDOVER";

/** A paid order with one personalised Palley and one collectible, print-ready unless told otherwise. */
async function paidOrder({ delivery = "HOME" as Delivery, printReady = true, locale = "nl", houseNumber = "12 bus 3" } = {}) {
  const previewId = randomUUID();
  await prisma.preview.create({
    data: { id: previewId, status: printReady ? "PRINT_READY" : "APPROVED", processedKey: printReady ? `previews/${previewId}/processed-1.zip` : null },
  });
  previewIds.push(previewId);
  const collectible = await prisma.collectible.create({
    data: { slug: `batch-${randomUUID().slice(0, 8)}`, name: "Batchtest", priceCents: 1000, animalCode: "HOND", modelKey: `collectibles/models/${randomUUID()}.zip` },
  });
  collectibleIds.push(collectible.id);
  const order = await prisma.$transaction(async (tx) =>
    tx.order.create({
      data: {
        number: await nextOrderNumber(tx),
        status: "PAID",
        paidAt: new Date(),
        email: "batch@example.com",
        firstName: "Batch",
        lastName: "Klant",
        street: delivery === "HOME" ? "Teststraat" : null,
        houseNumber: delivery === "HOME" ? houseNumber : null,
        postalCode: delivery === "HOME" ? "9000" : null,
        city: delivery === "HOME" ? "Gent" : null,
        country: "BE",
        locale,
        subtotalCents: 3799,
        shippingCents: 0,
        vatCents: 0,
        totalCents: 3799,
        statusTokenHash: "x",
        items: {
          create: [
            { position: 1, previewId, productCode: "P-RING-KAT", size: "M", edition: "keychain", attachment: "key-ring", animal: "cat", title: "Palley Kat", unitCents: 2799 },
            { position: 2, collectibleId: collectible.id, productCode: `COL-CLP-${String(collectible.number).padStart(3, "0")}`, size: "M", attachment: "clip", title: "Batchtest", quantity: 2, unitCents: 500 },
          ],
        },
        shipment: {
          create: {
            provider: "static",
            deliveryOptionId: delivery === "HOME" ? "be-bpost-home" : delivery === "PICKUP" ? "be-pickup-kantienberg" : "handover",
            deliveryType: delivery,
            carrier: delivery === "HOME" ? "bpost" : "Palleys",
            label: delivery,
            priceCents: 0,
          },
        },
      },
      include: { items: { orderBy: { position: "asc" } } },
    }),
  );
  orderIds.push(order.id);
  return order;
}

async function newBatch(ids: string[]) {
  const batch = await service.createBatch(ids, ADMIN);
  batchIds.push(batch.batchId);
  return batch;
}

const statusOf = async (id: string) => (await prisma.order.findUniqueOrThrow({ where: { id } })).status;
const checkInAll = async (order: { id: string; items: { id: string }[] }) => {
  for (const item of order.items) await setItemCheckIn(order.id, item.id, true, ADMIN);
};

describe("building a batch", () => {
  it("only offers and takes whole, print-ready paid orders", async () => {
    const ready = await paidOrder();
    const notReady = await paidOrder({ printReady: false });
    const page = await service.getBatchesPage();
    expect(page.ready.some((order) => order.id === ready.id)).toBe(true);
    expect(page.ready.some((order) => order.id === notReady.id)).toBe(false);
    await expect(service.createBatch([notReady.id], ADMIN)).rejects.toThrow("printklaar");
  });

  it("never puts an order in two batches, and gives one back when it comes out", async () => {
    const order = await paidOrder();
    const first = await newBatch([order.id]);
    expect(first.ref).toMatch(/^BATCH-\d{4,}$/);
    await expect(newBatch([order.id])).rejects.toThrow("al in een batch");

    await expect(service.deleteBatch(first.batchId)).rejects.toThrow("Haal eerst");
    await service.removeOrderFromBatch(first.batchId, order.id, ADMIN);
    expect((await service.getBatchesPage()).ready.some((row) => row.id === order.id)).toBe(true);
    await service.deleteBatch(first.batchId);
    expect(await prisma.batch.findUnique({ where: { id: first.batchId } })).toBeNull();
  });

  it("numbers batches without gaps, also when two are made at once", async () => {
    const [a, b] = [await paidOrder(), await paidOrder()];
    const made = await Promise.all([newBatch([a.id]), newBatch([b.id])]);
    const numbers = made.map((batch) => Number(batch.ref.slice("BATCH-".length))).sort((x, y) => x - y);
    expect(numbers[1] - numbers[0]).toBe(1);
  });

  it("takes a refunded order out of a batch that hasn't gone to JLC, with a warning", async () => {
    const order = await paidOrder();
    const { ref } = await newBatch([order.id]);
    expect(await moveOrder(order.id, "REFUNDED", `admin:${ADMIN}`)).toBe(true);
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.batchId).toBeNull();
    expect(after.attentionReason).toContain(`Uit ${ref} gehaald`);
  });
});

describe("the batch zip", () => {
  it("holds a folder per order with every Palley's print file and the manifest", async () => {
    const order = await paidOrder();
    const { batchId, ref } = await newBatch([order.id]);
    const prepared = await service.prepareBatchZip(batchId);
    expect(prepared.fileName).toBe(`${ref}.zip`);

    const chunks: Uint8Array[] = [];
    for await (const chunk of batchZipChunks(prepared.ref, prepared.entries, prepared.manifest)) chunks.push(chunk);
    const files = unzipSync(Buffer.concat(chunks));
    const palley = `PAL-${order.number}-01-P-RING-KAT_print.zip`;
    const col = `PAL-${order.number}-02-${order.items[1].productCode}_print.zip`;
    expect(Object.keys(files).sort()).toEqual([`${ref}/${order.number}/${palley}`, `${ref}/${order.number}/${col}`, `${ref}/manifest.csv`].sort());
    expect(strFromU8(files[`${ref}/${order.number}/${palley}`])).toBe(`${order.items[0] && `previews/${order.items[0].previewId}/processed-1.zip`}:end`);
    expect(strFromU8(files[`${ref}/manifest.csv`])).toContain(`${order.number},PAL-${order.number}-02-${order.items[1].productCode},${order.items[1].productCode},Keychain (clip),2,${col}`);
  });

  it("refuses the whole zip when one print file is missing, and says which", async () => {
    const order = await paidOrder();
    const { batchId } = await newBatch([order.id]);
    storage.missing.add(`previews/${order.items[0].previewId}/processed-1.zip`);
    await expect(service.prepareBatchZip(batchId)).rejects.toMatchObject({ missing: [`PAL-${order.number}-01-P-RING-KAT`] });
  });
});

describe("JLC and post-production", () => {
  it("runs a batch from JLC to completed, with delivery and pickup apart", async () => {
    const home = await paidOrder({ delivery: "HOME" });
    const pickup = await paidOrder({ delivery: "PICKUP" });
    const handover = await paidOrder({ delivery: "HANDOVER" });
    const { batchId, ref } = await newBatch([home.id, pickup.id, handover.id]);

    await service.sendBatchToJlc(batchId, ADMIN);
    expect(await Promise.all([home, pickup, handover].map((order) => statusOf(order.id)))).toEqual(["IN_PRODUCTION", "IN_PRODUCTION", "IN_PRODUCTION"]);
    await expect(service.addOrdersToBatch(batchId, [(await paidOrder()).id], ADMIN)).rejects.toThrow("al naar JLC");
    await expect(service.removeOrderFromBatch(batchId, home.id, ADMIN)).rejects.toThrow("al naar JLC");
    // At JLC: nothing to tick off yet.
    await expect(setItemCheckIn(home.id, home.items[0].id, true, ADMIN)).rejects.toThrow("terug is van JLC");

    await service.markBatchReceived(batchId, ADMIN);
    // A pickup can't be marked ready before it is checked in.
    await expect(service.markReadyForPickup(pickup.id, ADMIN)).rejects.toThrow("Vink eerst");

    // Only the home delivery goes to bpost.
    const bpost = await service.buildBatchBpostFile(batchId);
    expect(bpost.fileName).toBe(`BPOST-${ref}-BE-1.csv`);
    const csv = new TextDecoder("windows-1252").decode(bpost.bytes);
    expect(csv.match(new RegExp(home.number, "g"))).toHaveLength(1);
    expect(csv).toContain(";Teststraat;12;3;9000;Gent;");
    expect(csv).not.toContain(pickup.number);
    expect(csv).not.toContain(handover.number);

    // Delivery: blocked until checked in, then shipped all at once.
    expect(await service.shipAllDeliveries(batchId, ADMIN)).toEqual({ shipped: [], blocked: [home.number] });
    await checkInAll(home);
    expect(await service.shipAllDeliveries(batchId, ADMIN)).toEqual({ shipped: [home.number], blocked: [] });
    expect(await statusOf(home.id)).toBe("SHIPPED");

    // Pickup: ready mails once, then picked up.
    await checkInAll(pickup);
    expect(await service.markReadyForPickup(pickup.id, ADMIN)).toMatchObject({ mailed: true, alreadyReady: false });
    expect(await service.markReadyForPickup(pickup.id, ADMIN)).toMatchObject({ mailed: false, alreadyReady: true });
    expect(mail.sent.filter((sent) => sent.idempotencyKey === `pickup-ready-${pickup.id}`)).toHaveLength(1);
    expect(mail.sent[0].subject).toContain(pickup.number);
    expect(await statusOf(pickup.id)).toBe("IN_PRODUCTION");
    await updateOrderStatus(pickup.id, { status: "SHIPPED" }, ADMIN);

    // The last one out completes the batch.
    expect((await prisma.batch.findUniqueOrThrow({ where: { id: batchId } })).status).toBe("IN_POST_PRODUCTION");
    await checkInAll(handover);
    await updateOrderStatus(handover.id, { status: "SHIPPED" }, ADMIN);
    const done = await prisma.batch.findUniqueOrThrow({ where: { id: batchId }, include: { statusChanges: true } });
    expect(done.status).toBe("COMPLETED");
    expect(done.statusChanges.map((change) => change.toStatus).sort()).toEqual(["COMPLETED", "IN_POST_PRODUCTION", "OPEN", "SENT_TO_JLC"]);

    const collected = await service.listFinishedOrders("collected", 1);
    expect(collected.orders.find((order) => order.id === pickup.id)).toMatchObject({ batchRef: ref, deliveryType: "PICKUP" });
    const delivered = await service.listFinishedOrders("delivered", 1);
    expect(delivered.orders.some((order) => order.id === pickup.id)).toBe(false);
    expect(delivered.orders.some((order) => order.id === home.id)).toBe(true);
  });

  it("warns about an address bpost can't take instead of exporting it", async () => {
    const order = await paidOrder({ houseNumber: "12 3" });
    const { batchId } = await newBatch([order.id]);
    await service.sendBatchToJlc(batchId, ADMIN);
    await service.markBatchReceived(batchId, ADMIN);
    const page = await service.getProductionPage();
    const batch = page.postProduction.find((row) => row.id === batchId)!;
    expect(batch.bpostProblems).toEqual([{ orderNumber: order.number, problems: [expect.stringContaining("niet duidelijk")] }]);
    await expect(service.buildBatchBpostFile(batchId)).rejects.toThrow("Geen leveringen");
  });

  it("undoes a ready mark when the mail fails, so it can be retried", async () => {
    const pickup = await paidOrder({ delivery: "PICKUP" });
    const { batchId } = await newBatch([pickup.id]);
    await service.sendBatchToJlc(batchId, ADMIN);
    await service.markBatchReceived(batchId, ADMIN);
    await checkInAll(pickup);
    mail.fail = true;
    await expect(service.markReadyForPickup(pickup.id, ADMIN)).rejects.toThrow("probeer opnieuw");
    expect((await prisma.shipment.findUniqueOrThrow({ where: { orderId: pickup.id } })).readyForPickupAt).toBeNull();
  });

  it("sends pickup updates as often as needed, in each customer's language", async () => {
    const nl = await paidOrder({ delivery: "PICKUP" });
    const en = await paidOrder({ delivery: "PICKUP", locale: "en" });
    const { batchId } = await newBatch([nl.id, en.id]);
    await service.sendBatchToJlc(batchId, ADMIN);
    await service.markBatchReceived(batchId, ADMIN);
    for (const order of [nl, en]) {
      await checkInAll(order);
      await service.markReadyForPickup(order.id, ADMIN);
    }

    await expect(service.sendPickupUpdate({ nl: "Dinsdag 12-14u aan het onthaal." }, ADMIN)).rejects.toThrow("Engelse tekst");
    mail.sent = [];
    await service.sendPickupUpdate({ nl: "Dinsdag 12-14u aan het onthaal.", en: "Tuesday 12-2pm at the front desk." }, ADMIN);
    await service.sendPickupUpdate({ nl: "Toch woensdag.", en: "Wednesday after all." }, ADMIN);
    const forNl = mail.sent.filter((sent) => sent.subject.includes(nl.number));
    const forEn = mail.sent.filter((sent) => sent.subject.includes(en.number));
    expect(forNl.map((sent) => sent.text)).toEqual([expect.stringContaining("Dinsdag 12-14u"), expect.stringContaining("Toch woensdag")]);
    expect(forEn[0].text).toContain("Tuesday 12-2pm");
    expect((await prisma.shipment.findUniqueOrThrow({ where: { orderId: nl.id } })).lastPickupUpdateAt).not.toBeNull();
  });
});
