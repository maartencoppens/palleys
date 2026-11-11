import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";

/*
 * The cron route as the VPS calls it: the bearer secret, and every job in one run (unpaid orders, carts, rate limits,
 * /retour links, retention), against the local database with R2 and Stripe mocked.
 */

const SECRET = "test-cron-secret-0123456789abcdef0123456789";
process.env.CRON_SECRET = SECRET;

const storage = vi.hoisted(() => ({ deleted: [] as string[] }));
vi.mock("@/core/networking/external/storage-client", () => ({
  deleteObject: async (key: string) => void storage.deleted.push(key),
  createDownloadUrl: async (key: string) => `https://r2.test/${key}`,
  objectExists: async () => true,
}));
vi.mock("@/core/modules/payments/providers", () => ({
  paymentProvider: { name: "stripe", getPayment: async () => { throw new Error("not called in this test"); } },
}));

const { prisma } = await import("@/db/client");
const { POST } = await import("./route");

const call = (authorization?: string) =>
  POST(new Request("http://localhost/api/cron/expire-orders", { method: "POST", headers: authorization ? { authorization } : {} }));

const previewId = randomUUID();

afterAll(async () => {
  await prisma.preview.deleteMany({ where: { id: previewId } });
  await prisma.$disconnect();
});

describe("cron route", () => {
  it("refuses a call without the right secret", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
  });

  it("runs every job, retention included", async () => {
    await prisma.preview.create({
      data: {
        id: previewId,
        status: "UPLOADED",
        expiresAt: new Date(Date.now() - 60_000),
        photos: { create: { key: `previews/${previewId}/photo.jpg` } },
      },
    });
    const response = await call(`Bearer ${SECRET}`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, retention: { expiredUploads: expect.any(Number), photos: expect.any(Number), printModels: expect.any(Number) } });
    expect(body).toHaveProperty("returnLinks");
    expect((await prisma.preview.findUniqueOrThrow({ where: { id: previewId } })).status).toBe("EXPIRED");
    expect(storage.deleted).toContain(`previews/${previewId}/photo.jpg`);
  });
});
