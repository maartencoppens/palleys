import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { strToU8, zipSync } from "fflate";

/*
 * An admin's own 3D model instead of Meshy's, and sending a whole order to a later step by hand. Against the local
 * database; R2, Meshy and the mail are mocked.
 */

const storage = vi.hoisted(() => ({ objects: new Map<string, Buffer>() }));
vi.mock("@/core/networking/external/storage-client", () => ({
  objectExists: async (key: string) => storage.objects.has(key),
  createDownloadUrl: async (key: string) => `https://r2.test/${key}`,
  createUploadUrl: async (key: string) => `https://r2.test/upload/${key}`,
  putObject: async (key: string, body: Buffer) => void storage.objects.set(key, body),
  deleteObject: async (key: string) => void storage.objects.delete(key),
  getObject: async (key: string) => storage.objects.get(key) ?? Buffer.from(""),
}));

vi.mock("@/core/networking/external/meshy-client", () => ({
  MeshyError: class MeshyError extends Error {},
  assertValidWebhookToken: () => undefined,
  createImageTo3dTask: async () => `task-${randomUUID()}`,
  getImageTo3dTask: async () => ({ status: "IN_PROGRESS" }),
  getModelFileUrls: () => null,
  downloadModel: async () => Buffer.from(""),
  isFinishedStatus: () => false,
}));

vi.mock("@/core/networking/external/email-client", () => ({
  EmailError: class EmailError extends Error {},
  isEmailConfigured: () => false,
  sendEmail: async () => false,
}));

const { default: sharp } = await import("sharp");
const { prisma } = await import("@/db/client");
const { createManualOrder } = await import("@/core/modules/orders/admin");
const { manualOrderSchema } = await import("@/core/modules/orders/types");
const { recordManualPayment } = await import("@/core/modules/payments/service");
const { confirmOwnModelUpload, createOwnModelUpload, getPreviewForAdmin } = await import("./service");
const { forwardOrderToStep, getBatchesPage, createBatch } = await import("@/core/modules/batches/service");

const ADMIN = "Test Admin";
const createdOrders = new Set<string>();

async function manualOrder(payment: "later" | "paid", lines = 1) {
  const result = await createManualOrder(
    manualOrderSchema.parse({
      customer: { firstName: "Model", lastName: "Testmans" },
      lines: Array.from({ length: lines }, () => ({ kind: "personalized", animal: "dog", edition: "keychain", quantity: 1 })),
      delivery: { type: "handover" },
      payment: payment === "paid" ? { type: "paid", method: "cash" } : { type: "later" },
      sendConfirmation: false,
    }),
    ADMIN,
  );
  createdOrders.add(result.orderId);
  return { orderId: result.orderId, previewId: result.previews[0].previewId, previewIds: result.previews.map((p) => p.previewId) };
}

async function modelZip({ glb = false, jpg = true } = {}) {
  const texture = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#c08040" } })[jpg ? "jpeg" : "png"]().toBuffer();
  return Buffer.from(
    zipSync({
      "export/dog.obj": strToU8("mtllib dog.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3"),
      "export/dog.mtl": strToU8(`newmtl fur\nmap_Kd fur.${jpg ? "jpg" : "png"}`),
      [`export/fur.${jpg ? "jpg" : "png"}`]: new Uint8Array(texture),
      ...(glb && { "export/dog.glb": strToU8("glTF") }),
    }),
  );
}

/** What the browser does: ask for a URL, put the zip in R2, confirm. */
async function uploadModel(previewId: string, zip: Buffer, printReady = false) {
  const { key } = await createOwnModelUpload(previewId, printReady);
  storage.objects.set(key, zip);
  return { key, result: await confirmOwnModelUpload(previewId, { key, printReady }, ADMIN) };
}

const loadPreview = (id: string) => prisma.preview.findUniqueOrThrow({ where: { id } });
const loadOrder = (id: string) =>
  prisma.order.findUniqueOrThrow({ where: { id }, include: { batch: true, items: true, shipment: true } });

afterAll(async () => {
  const ids = [...createdOrders];
  const orders = await prisma.order.findMany({ where: { id: { in: ids } }, select: { batchId: true } });
  const items = await prisma.orderItem.findMany({ where: { orderId: { in: ids } }, select: { previewId: true } });
  await prisma.orderStatusChange.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.shipment.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.order.deleteMany({ where: { id: { in: ids } } });
  const batchIds = orders.flatMap((order) => order.batchId ?? []);
  await prisma.batch.deleteMany({ where: { id: { in: batchIds }, orders: { none: {} } } });
  await prisma.preview.deleteMany({ where: { id: { in: items.flatMap((item) => item.previewId ?? []) } } });
  await prisma.$disconnect();
});

describe("an own 3D model", () => {
  it("waits on an unpaid manual order, then stands ready for review once paid, without Meshy", async () => {
    const { orderId, previewId } = await manualOrder("later");
    const { key } = await uploadModel(previewId, await modelZip());

    let preview = await loadPreview(previewId);
    expect(preview.status).toBe("UPLOADED");
    expect(preview.objKey && storage.objects.has(preview.objKey)).toBe(true);
    // A JPG texture is stored as PNG, the name the print download expects; the zip itself is no longer needed.
    expect((await sharp(storage.objects.get(preview.textureKey!)!).metadata()).format).toBe("png");
    expect(preview.glbKey).toBeNull();
    expect(storage.objects.has(key)).toBe(false);

    await recordManualPayment(orderId, "transfer", ADMIN, { sendConfirmation: false });
    preview = await loadPreview(previewId);
    expect(preview.status).toBe("MODEL_READY");
    expect(preview.meshyTaskId).toBeNull();
    expect((await loadOrder(orderId)).productionStartedAt).not.toBeNull();

    // Review as usual; the viewer shows the OBJ, since there's no GLB.
    const detail = await getPreviewForAdmin(previewId);
    expect(detail).toMatchObject({ canApprove: true, hasModel: true, glbUrl: null, canUploadModel: true });
    expect(detail?.objModelUrls?.obj).toContain(preview.objKey);
  });

  it("goes straight to Klaar voor print when it's print-ready, and the order can go into a batch", async () => {
    const { orderId, previewId } = await manualOrder("paid");
    const { key, result } = await uploadModel(previewId, await modelZip({ glb: true }), true);
    expect(result.status).toBe("PRINT_READY");

    const preview = await loadPreview(previewId);
    expect(preview).toMatchObject({ processedKey: key, processedBy: ADMIN });
    expect(preview.glbKey).not.toBeNull();
    expect((await getBatchesPage()).ready.map((order) => order.id)).toContain(orderId);
  });

  it("refuses a zip without a texture and leaves the preview as it was", async () => {
    const { previewId } = await manualOrder("paid");
    const { key } = await createOwnModelUpload(previewId, false);
    storage.objects.set(key, Buffer.from(zipSync({ "a.obj": strToU8("v 0 0 0"), "a.mtl": strToU8("newmtl a") })));
    await expect(confirmOwnModelUpload(previewId, { key, printReady: false }, ADMIN)).rejects.toThrow("geen textuur");
    expect((await loadPreview(previewId)).status).toBe("PAID");
    expect(storage.objects.has(key)).toBe(false);
  });

  it("is refused once the model is approved", async () => {
    const { previewId } = await manualOrder("paid");
    await prisma.preview.update({ where: { id: previewId }, data: { status: "APPROVED" } });
    await expect(createOwnModelUpload(previewId, false)).rejects.toThrow("al goedgekeurd");
  });
});

describe("sending an order to a later step by hand", () => {
  it("goes to JLC in a batch of its own, its Palleys print-ready, and then finishes it", async () => {
    const { orderId, previewId } = await manualOrder("paid");
    const sent = await forwardOrderToStep(orderId, { step: "AT_JLC", reason: "Zelf aangeleverd" }, ADMIN);

    let order = await loadOrder(orderId);
    expect(order.status).toBe("IN_PRODUCTION");
    expect(order.batch?.status).toBe("SENT_TO_JLC");
    expect(sent.batchRef).toMatch(/^BATCH-/);
    expect((await loadPreview(previewId)).status).toBe("PRINT_READY");
    expect(await prisma.previewStatusChange.count({ where: { previewId, toStatus: "PRINT_READY" } })).toBe(1);

    // Backwards isn't a step.
    await expect(forwardOrderToStep(orderId, { step: "BATCH", reason: "terug" }, ADMIN)).rejects.toThrow("alleen vooruit");

    await forwardOrderToStep(orderId, { step: "FINISHED", reason: "Overhandigd" }, ADMIN);
    order = await loadOrder(orderId);
    expect(order.status).toBe("SHIPPED");
    expect(order.items.every((item) => item.checkedInAt)).toBe(true);
    expect(order.shipment?.shippedAt).not.toBeNull();
    // Alone in its batch: the batch came back and completed with it.
    expect(order.batch?.status).toBe("COMPLETED");
  });

  it("puts an order in a chosen open batch, and takes it out of a shared one to send it on alone", async () => {
    const first = await manualOrder("paid");
    const second = await manualOrder("paid");
    await forwardOrderToStep(first.orderId, { step: "BATCH", reason: "Mee in de volgende" }, ADMIN);
    const batchId = (await loadOrder(first.orderId)).batchId!;
    await forwardOrderToStep(second.orderId, { step: "BATCH", batchId, reason: "Erbij" }, ADMIN);
    expect((await loadOrder(second.orderId)).batchId).toBe(batchId);

    await forwardOrderToStep(second.orderId, { step: "POST_PRODUCTION", reason: "Al terug" }, ADMIN);
    const second2 = await loadOrder(second.orderId);
    expect(second2.batchId).not.toBe(batchId);
    expect(second2.batch?.status).toBe("IN_POST_PRODUCTION");
    expect((await loadOrder(first.orderId)).batch?.status).toBe("OPEN");
  });

  it("refuses an unpaid order", async () => {
    const { orderId } = await manualOrder("later");
    await expect(forwardOrderToStep(orderId, { step: "BATCH", reason: "nope" }, ADMIN)).rejects.toThrow("betaalde order");
  });

  it("doesn't move a batch at JLC that other orders are in", async () => {
    const first = await manualOrder("paid");
    const second = await manualOrder("paid");
    for (const { previewId } of [first, second]) {
      await uploadModel(previewId, await modelZip(), true);
    }
    const { batchId } = await createBatch([first.orderId, second.orderId], ADMIN);
    await forwardOrderToStep(first.orderId, { step: "AT_JLC", reason: "eigen batch" }, ADMIN);
    expect((await loadOrder(first.orderId)).batchId).not.toBe(batchId);
    // The other one: alone in its batch now, so it may move it.
    await forwardOrderToStep(second.orderId, { step: "AT_JLC", reason: "ook" }, ADMIN);
    expect((await loadOrder(second.orderId)).batchId).toBe(batchId);
  });
});
