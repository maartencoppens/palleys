import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Pose attempts side by side and choosing one: generated attempts are kept, an admin's own upload joins them without
 * using up an attempt, approving a specific one makes the 3D model from exactly that one, and once the model is approved
 * the others are cleaned up. Also a pose uploaded with a manual order: the preview waits at "pose ready", never more.
 * Against the local database; R2, Gemini and Meshy are mocked.
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

const gemini = vi.hoisted(() => ({ calls: 0 }));
vi.mock("@/core/networking/external/gemini-client", () => ({
  generatePose: async () => {
    gemini.calls++;
    return { image: Buffer.from(`generated pose ${gemini.calls}`), mimeType: "image/png" };
  },
}));

const meshy = vi.hoisted(() => ({ images: [] as string[] }));
vi.mock("@/core/networking/external/meshy-client", () => ({
  MeshyError: class MeshyError extends Error {},
  assertValidWebhookToken: () => undefined,
  createImageTo3dTask: async (input: { image: Buffer }) => {
    meshy.images.push(input.image.toString());
    return `task-${randomUUID()}`;
  },
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
const { approvePoseCandidate, approvePreview, generatePose, getPreviewForAdmin, uploadPose } = await import("./service");
const { MAX_POSE_ATTEMPTS, MAX_UPLOADED_POSES } = await import("@/data/pipeline");

const ADMIN = "Test Admin";
const createdOrders = new Set<string>();
const createdPreviews = new Set<string>();

const image = (color: string) => sharp({ create: { width: 16, height: 16, channels: 3, background: color } }).png().toBuffer();

async function manualOrder(payment: "later" | "paid") {
  const result = await createManualOrder(
    manualOrderSchema.parse({
      customer: { firstName: "Pose", lastName: "Testmans" },
      lines: [{ kind: "personalized", animal: "dog", edition: "keychain", quantity: 1 }],
      delivery: { type: "handover" },
      payment: payment === "paid" ? { type: "paid", method: "cash" } : { type: "later" },
      sendConfirmation: false,
    }),
    ADMIN,
  );
  createdOrders.add(result.orderId);
  return { orderId: result.orderId, previewId: result.previews[0].previewId };
}

/** A paid preview with a photo, ready for the pipeline. */
async function paidPreview() {
  const { previewId } = await manualOrder("paid");
  const photo = `previews/${previewId}/photo-${randomUUID()}.jpg`;
  storage.objects.set(photo, Buffer.from("photo"));
  await prisma.previewPhoto.create({ data: { previewId, key: photo, uploadedBy: ADMIN } });
  return previewId;
}

const loadPreview = (id: string) =>
  prisma.preview.findUniqueOrThrow({ where: { id }, include: { poseCandidates: { orderBy: { createdAt: "asc" } } } });

beforeEach(() => {
  meshy.images.length = 0;
});

afterAll(async () => {
  const ids = [...createdOrders];
  const items = await prisma.orderItem.findMany({ where: { orderId: { in: ids } }, select: { previewId: true } });
  await prisma.orderStatusChange.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.shipment.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.order.deleteMany({ where: { id: { in: ids } } });
  await prisma.preview.deleteMany({ where: { id: { in: [...items.flatMap((item) => item.previewId ?? []), ...createdPreviews] } } });
  await prisma.$disconnect();
});

describe("a pose uploaded with a manual order", () => {
  it("waits until the order is paid, then stands at pose ready without starting Meshy", async () => {
    const { orderId, previewId } = await manualOrder("later");
    await uploadPose(previewId, await image("#ff0000"), ADMIN);

    let preview = await loadPreview(previewId);
    expect(preview.status).toBe("UPLOADED");
    expect(preview.poseCandidates).toHaveLength(1);
    expect(preview.poseCandidates[0]).toMatchObject({ source: "UPLOADED", createdBy: ADMIN, approvedAt: null });
    expect(preview.poseImageKey).toBe(preview.poseCandidates[0].key);
    expect(storage.objects.has(preview.poseImageKey!)).toBe(true);

    await recordManualPayment(orderId, "transfer", ADMIN, { sendConfirmation: false });
    preview = await loadPreview(previewId);
    expect(preview.status).toBe("POSE_READY");
    expect(preview.poseAttempts).toBe(0);
    expect(meshy.images).toHaveLength(0);

    // The same flow as a generated pose from here: approve it, or still generate a new one.
    const detail = await getPreviewForAdmin(previewId);
    expect(detail).toMatchObject({ canApprovePose: true, canGeneratePose: true, poseAttemptsLeft: MAX_POSE_ATTEMPTS });
    expect(detail?.poseCandidates).toEqual([expect.objectContaining({ label: "Eigen pose", createdBy: ADMIN, current: true })]);
  });

  it("is at pose ready right away when the order was paid on the spot", async () => {
    const { previewId } = await manualOrder("paid");
    expect((await loadPreview(previewId)).status).toBe("PAID");
    await uploadPose(previewId, await image("#00ff00"), ADMIN);
    expect((await loadPreview(previewId)).status).toBe("POSE_READY");
    expect(meshy.images).toHaveLength(0);
  });

  it("is refused for a website upload that nobody paid for", async () => {
    const preview = await prisma.preview.create({ data: { expiresAt: new Date(Date.now() + 3_600_000) } });
    createdPreviews.add(preview.id);
    await expect(uploadPose(preview.id, await image("#0000ff"), ADMIN)).rejects.toThrow("betaald");
  });
});

describe("comparing pose attempts", () => {
  it("keeps every attempt, approves the chosen one and cleans up the rest once the model is approved", async () => {
    const previewId = await paidPreview();
    await generatePose(previewId);
    await generatePose(previewId);
    await uploadPose(previewId, await image("#123456"), ADMIN);

    let preview = await loadPreview(previewId);
    expect(preview.status).toBe("POSE_READY");
    expect(preview.poseAttempts).toBe(2); // the upload doesn't count
    expect(preview.poseCandidates.map((candidate) => candidate.source)).toEqual(["GENERATED", "GENERATED", "UPLOADED"]);
    for (const candidate of preview.poseCandidates) expect(storage.objects.has(candidate.key)).toBe(true);
    expect(preview.poseImageKey).toBe(preview.poseCandidates[2].key); // the newest is the current one

    const detail = await getPreviewForAdmin(previewId);
    expect(detail?.poseCandidates.map((candidate) => candidate.label)).toEqual(["Poging 1", "Poging 2", "Eigen pose"]);
    expect(detail?.poseAttemptsLeft).toBe(MAX_POSE_ATTEMPTS - 2);

    // The first attempt was the best: Meshy gets exactly that image.
    const [first, second, upload] = preview.poseCandidates;
    await approvePoseCandidate(previewId, first.id, ADMIN);
    preview = await loadPreview(previewId);
    expect(preview.status).toBe("GENERATING_MODEL");
    expect(preview.poseImageKey).toBe(first.key);
    expect(meshy.images).toEqual(["generated pose 1"]);
    expect(preview.poseCandidates.find((candidate) => candidate.id === first.id)).toMatchObject({ approvedBy: ADMIN });
    expect(preview.poseCandidates.find((candidate) => candidate.id === second.id)?.approvedAt).toBeNull();

    // Model done (Meshy is mocked) and approved: only the chosen pose stays.
    await prisma.preview.update({ where: { id: previewId }, data: { status: "MODEL_READY", animalType: "HOND" } });
    await approvePreview(previewId);
    preview = await loadPreview(previewId);
    expect(preview.poseCandidates.map((candidate) => candidate.id)).toEqual([first.id]);
    expect(storage.objects.has(first.key)).toBe(true);
    expect(storage.objects.has(second.key)).toBe(false);
    expect(storage.objects.has(upload.key)).toBe(false);
    await expect(uploadPose(previewId, await image("#654321"), ADMIN)).rejects.toThrow("ligt vast");
  });

  it("refuses a pose of another preview and approving while no model can be made", async () => {
    const previewId = await paidPreview();
    const other = await paidPreview();
    await generatePose(other);
    const [candidate] = (await loadPreview(other)).poseCandidates;
    await expect(approvePoseCandidate(previewId, candidate.id, ADMIN)).rejects.toThrow();

    await prisma.preview.update({ where: { id: other }, data: { status: "GENERATING_MODEL" } });
    await expect(approvePoseCandidate(other, candidate.id, ADMIN)).rejects.toThrow("GENERATING_MODEL");
  });

  it("allows a limited number of own uploads, apart from the attempts", async () => {
    const previewId = await paidPreview();
    for (let i = 0; i < MAX_UPLOADED_POSES; i++) await uploadPose(previewId, await image("#abcdef"), ADMIN);
    await expect(uploadPose(previewId, await image("#abcdef"), ADMIN)).rejects.toThrow(`Maximum ${MAX_UPLOADED_POSES}`);
    expect((await loadPreview(previewId)).poseAttempts).toBe(0);
    await generatePose(previewId); // attempts are still all there
    expect((await loadPreview(previewId)).poseCandidates).toHaveLength(MAX_UPLOADED_POSES + 1);
  });
});
