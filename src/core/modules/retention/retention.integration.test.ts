import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The retention periods of the privacy policy, against the local database with R2 mocked: what the cron deletes, and
 * what it leaves (consent for marketing, an order still running, an R2 delete that failed).
 */

const storage = vi.hoisted(() => ({ deleted: [] as string[], failing: new Set<string>() }));

vi.mock("@/core/networking/external/storage-client", () => ({
  deleteObject: async (key: string) => {
    if (storage.failing.has(key)) throw new Error("R2 down");
    storage.deleted.push(key);
  },
  createDownloadUrl: async (key: string) => `https://r2.test/${key}`,
  objectExists: async () => true,
}));

const { prisma } = await import("@/db/client");
const { applyRetention } = await import("./service");

const DAY = 24 * 60 * 60 * 1000;
const createdOrders: string[] = [];
const createdPreviews: string[] = [];

async function preview(data: object = {}) {
  const id = randomUUID();
  await prisma.preview.create({
    data: {
      id,
      status: "PRINT_READY",
      poseImageKey: `previews/${id}/pose.png`,
      glbKey: `previews/${id}/model.glb`,
      processedKey: `previews/${id}/processed.zip`,
      photos: { create: [{ key: `previews/${id}/photo-1.jpg` }, { key: `previews/${id}/photo-2.jpg` }] },
      ...data,
    },
  });
  createdPreviews.push(id);
  return id;
}

/** A paid order for the preview, picked up `daysAgo` days ago (or still running with `status`). */
async function order(previewId: string, { daysAgo = 0, status = "SHIPPED", consent = false } = {}) {
  const id = randomUUID();
  await prisma.order.create({
    data: {
      id,
      number: `PLY9${Math.floor(Math.random() * 1e8)}`,
      status: status as "SHIPPED",
      firstName: "Bewaar",
      lastName: "Test",
      country: "BE",
      subtotalCents: 2799,
      shippingCents: 0,
      vatCents: 0,
      totalCents: 2799,
      statusTokenHash: randomUUID(),
      photoMarketingConsent: consent,
      items: { create: { position: 1, previewId, productCode: "P-CLP-HOND", size: "M", title: "Palley Hond", unitCents: 2799 } },
      shipment: {
        create: {
          provider: "static",
          deliveryOptionId: "be-pickup-kantienberg",
          deliveryType: "PICKUP",
          carrier: "Palleys",
          label: "Ophalen",
          priceCents: 0,
          shippedAt: status === "SHIPPED" ? new Date(Date.now() - daysAgo * DAY) : null,
        },
      },
    },
  });
  createdOrders.push(id);
}

const load = (id: string) => prisma.preview.findUniqueOrThrow({ where: { id }, include: { photos: true } });

beforeEach(() => {
  storage.deleted.length = 0;
  storage.failing.clear();
});

afterAll(async () => {
  await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrders } } });
  await prisma.shipment.deleteMany({ where: { orderId: { in: createdOrders } } });
  await prisma.order.deleteMany({ where: { id: { in: createdOrders } } });
  await prisma.preview.deleteMany({ where: { id: { in: createdPreviews } } });
  await prisma.$disconnect();
});

describe("retention", () => {
  it("expires unpaid uploads after their expiry and deletes their photos", async () => {
    const id = await preview({ status: "UPLOADED", expiresAt: new Date(Date.now() - DAY), poseImageKey: null, glbKey: null, processedKey: null });
    const fresh = await preview({ status: "UPLOADED", expiresAt: new Date(Date.now() + DAY), poseImageKey: null, glbKey: null, processedKey: null });
    await applyRetention();
    const expired = await load(id);
    expect(expired.status).toBe("EXPIRED");
    expect(expired.photos).toHaveLength(0);
    expect(expired.photosDeletedAt).not.toBeNull();
    expect(storage.deleted).toEqual(expect.arrayContaining([`previews/${id}/photo-1.jpg`, `previews/${id}/photo-2.jpg`]));
    expect((await load(fresh)).photos).toHaveLength(2);
  });

  it("deletes photos, pose and in-between model 6 weeks after pickup, and keeps the print model", async () => {
    const id = await preview();
    await order(id, { daysAgo: 43 });
    const recent = await preview();
    await order(recent, { daysAgo: 20 });
    await applyRetention();

    const done = await load(id);
    expect(done.photos).toHaveLength(0);
    expect(done).toMatchObject({ poseImageKey: null, glbKey: null, processedKey: `previews/${id}/processed.zip`, status: "PRINT_READY" });
    expect(done.photosDeletedAt).not.toBeNull();
    expect(storage.deleted).toEqual(expect.arrayContaining([`previews/${id}/photo-1.jpg`, `previews/${id}/pose.png`, `previews/${id}/model.glb`]));
    expect(storage.deleted).not.toContain(`previews/${id}/processed.zip`);
    expect((await load(recent)).photos).toHaveLength(2);
  });

  it("keeps the photos with consent for marketing, or while a reprint is still running", async () => {
    const consented = await preview();
    await order(consented, { daysAgo: 100, consent: true });
    const reprinting = await preview();
    await order(reprinting, { daysAgo: 100 });
    await order(reprinting, { status: "PAID" });
    await applyRetention();
    expect((await load(consented)).photos).toHaveLength(2);
    expect((await load(reprinting)).photos).toHaveLength(2);
  });

  it("deletes the print model 2 years after delivery", async () => {
    const id = await preview();
    await order(id, { daysAgo: 2 * 366 + 1 });
    await applyRetention();
    const done = await load(id);
    expect(done.processedKey).toBeNull();
    expect(done.modelDeletedAt).not.toBeNull();
    expect(storage.deleted).toContain(`previews/${id}/processed.zip`);
  });

  it("tries again next time when R2 couldn't delete a file", async () => {
    const id = await preview();
    await order(id, { daysAgo: 43 });
    storage.failing.add(`previews/${id}/pose.png`);
    await applyRetention();
    expect((await load(id)).photosDeletedAt).toBeNull();
    storage.failing.clear();
    await applyRetention();
    expect((await load(id)).photosDeletedAt).not.toBeNull();
  });
});
