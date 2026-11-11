import "server-only";
import { prisma } from "@/db/client";
import type { Prisma } from "@/db/generated/client";
import { deleteObject } from "@/core/networking/external/storage-client";
import { brusselsDay } from "@/core/modules/returns/utils";
import { PHOTO_RETENTION_DAYS, PRINT_MODEL_RETENTION_YEARS, RETENTION_BATCH_SIZE } from "@/data/retention";
import { photosAreDue, printModelIsDue, type RetentionOrder } from "./utils";

/*
 * The retention periods of the privacy policy (art. 6), run by the cron:
 *   - uploads that were never paid: after their expiry (7 days), photos deleted and the preview EXPIRED;
 *   - photos of the pet, the pose and the in-between 3D models: 6 weeks after delivery, pickup or refund, unless the
 *     customer gave consent for marketing (art. 5.4 of the terms);
 *   - the print-ready model: 2 years after delivery, when it can't be needed for a reprint any more.
 * The rows stay (orders keep pointing at them); the files go from R2 and their keys are cleared. A file R2 couldn't
 * delete keeps its key, so the next run tries again.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const PAID_STATUSES = ["PAID", "IN_PRODUCTION", "SHIPPED", "REFUNDED"] as const;
const STILL_OURS = ["PAID", "IN_PRODUCTION"] as const;

/** Deletes the files from R2; true when every one is gone (deleting a missing key counts as gone). */
async function deleteFiles(keys: (string | null)[]) {
  const results = await Promise.all(
    keys.flatMap((key) => (key ? [key] : [])).map((key) =>
      deleteObject(key).then(
        () => true,
        (error) => {
          console.error(`[retention] could not delete ${key}:`, error instanceof Error ? error.message : error);
          return false;
        },
      ),
    ),
  );
  return results.every(Boolean);
}

// ---------- Unpaid uploads ----------

async function deleteExpiredUploads(now: Date) {
  const previews = await prisma.preview.findMany({
    where: { status: "UPLOADED", expiresAt: { lt: now } },
    orderBy: { expiresAt: "asc" },
    take: RETENTION_BATCH_SIZE,
    select: { id: true, photos: { select: { key: true } }, poseCandidates: { select: { key: true } } },
  });
  let deleted = 0;
  for (const preview of previews) {
    const keys = [...preview.photos.map((photo) => photo.key), ...preview.poseCandidates.map((candidate) => candidate.key)];
    if (!(await deleteFiles(keys))) continue;
    // Only while it's still unpaid: a payment that came in meanwhile wins.
    const { count } = await prisma.preview.updateMany({
      where: { id: preview.id, status: "UPLOADED" },
      data: { status: "EXPIRED", photosDeletedAt: now },
    });
    if (count === 0) continue;
    await prisma.previewPhoto.deleteMany({ where: { previewId: preview.id } });
    await prisma.poseCandidate.deleteMany({ where: { previewId: preview.id } });
    await prisma.preview.updateMany({ where: { id: preview.id }, data: { poseImageKey: null } });
    deleted++;
  }
  return deleted;
}

// ---------- Paid orders ----------

// The paid orders a preview is on, with what the rules need.
const ORDERS_SELECT = {
  orderItems: {
    where: { order: { status: { in: [...PAID_STATUSES] } } },
    select: {
      order: {
        select: {
          status: true,
          photoMarketingConsent: true,
          shipment: { select: { deliveryType: true, shippedAt: true, deliveredAt: true } },
          statusChanges: { where: { toStatus: "REFUNDED" }, orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
        },
      },
    },
  },
} as const satisfies Prisma.PreviewSelect;

type WithOrders = Prisma.PreviewGetPayload<{ select: typeof ORDERS_SELECT }>;

const retentionOrders = (preview: WithOrders): RetentionOrder[] =>
  preview.orderItems.map(({ order }) => ({
    status: order.status,
    photoMarketingConsent: order.photoMarketingConsent,
    shipment: order.shipment,
    refundedAt: order.statusChanges[0]?.createdAt ?? null,
  }));

/** A first sift in the database (finished long enough ago, nothing still running); the rules in utils.ts decide. */
const finishedBefore = (cutoff: Date): Prisma.PreviewWhereInput => ({
  forCollectible: false,
  orderItems: {
    some: {
      order: {
        OR: [
          { status: "SHIPPED", shipment: { shippedAt: { lt: cutoff } } },
          { status: "REFUNDED", updatedAt: { lt: cutoff } },
        ],
      },
    },
    none: { order: { status: { in: [...STILL_OURS] } } },
  },
});

async function deletePhotosAfterDelivery(now: Date) {
  const today = brusselsDay(now);
  const previews = await prisma.preview.findMany({
    where: {
      photosDeletedAt: null,
      ...finishedBefore(new Date(now.getTime() - PHOTO_RETENTION_DAYS * DAY_MS)),
      // Consent keeps them; leaving those out here keeps them from filling every batch.
      AND: { orderItems: { none: { order: { photoMarketingConsent: true } } } },
    },
    orderBy: { createdAt: "asc" },
    take: RETENTION_BATCH_SIZE,
    select: {
      id: true,
      poseImageKey: true,
      glbKey: true,
      objKey: true,
      mtlKey: true,
      textureKey: true,
      photos: { select: { key: true } },
      poseCandidates: { select: { key: true } },
      ...ORDERS_SELECT,
    },
  });
  let deleted = 0;
  for (const preview of previews) {
    if (!photosAreDue(retentionOrders(preview), today)) continue;
    const keys = [
      ...preview.photos.map((photo) => photo.key),
      ...preview.poseCandidates.map((candidate) => candidate.key), // every pose attempt, also the ones not chosen
      preview.poseImageKey,
      preview.glbKey,
      preview.objKey,
      preview.mtlKey,
      preview.textureKey,
    ];
    if (!(await deleteFiles(keys))) continue;
    await prisma.$transaction([
      prisma.previewPhoto.deleteMany({ where: { previewId: preview.id } }),
      prisma.poseCandidate.deleteMany({ where: { previewId: preview.id } }),
      prisma.preview.update({
        where: { id: preview.id },
        data: { photosDeletedAt: now, poseImageKey: null, glbKey: null, objKey: null, mtlKey: null, textureKey: null },
      }),
    ]);
    deleted++;
  }
  return deleted;
}

async function deletePrintModelsAfterWarranty(now: Date) {
  const today = brusselsDay(now);
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - PRINT_MODEL_RETENTION_YEARS);
  const previews = await prisma.preview.findMany({
    where: { modelDeletedAt: null, processedKey: { not: null }, ...finishedBefore(cutoff) },
    orderBy: { createdAt: "asc" },
    take: RETENTION_BATCH_SIZE,
    select: { id: true, processedKey: true, ...ORDERS_SELECT },
  });
  let deleted = 0;
  for (const preview of previews) {
    if (!printModelIsDue(retentionOrders(preview), today)) continue;
    if (!(await deleteFiles([preview.processedKey]))) continue;
    await prisma.preview.update({ where: { id: preview.id }, data: { modelDeletedAt: now, processedKey: null } });
    deleted++;
  }
  return deleted;
}

/** One cron run of every retention rule. Returns how many previews each rule cleared. */
export async function applyRetention(now: Date = new Date()) {
  return {
    expiredUploads: await deleteExpiredUploads(now),
    photos: await deletePhotosAfterDelivery(now),
    printModels: await deletePrintModelsAfterWarranty(now),
  };
}
