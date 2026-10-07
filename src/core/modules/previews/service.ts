import "server-only";
import { randomUUID } from "node:crypto";
import { prisma, PreviewStatus } from "@/db/client";
import {
  createDownloadUrl,
  createUploadUrl,
  getObject,
  putObject,
} from "@/core/networking/external/storage-client";
import {
  assertTransition,
  canTransition,
  InvalidTransitionError,
  statusesThatCanTransitionTo,
} from "./status";
import {
  mimeTypeForKey,
  poseImageKey,
  toErrorMessage,
  unpaidExpiry,
} from "./utils";
import type {
  AdminPreviewDetail,
  AdminPreviewListItem,
  CreateUploadInput,
} from "./types";
import { MAX_POSE_ATTEMPTS } from "@/data/pipeline";

const EXTENSIONS: Record<CreateUploadInput["contentType"], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

import { generatePose as geminiGeneratePose } from "@/core/networking/external/gemini-client";

export class PreviewNotFoundError extends Error {}
export class PreviewConflictError extends Error {}

export async function createPreview(input: CreateUploadInput) {
  const id = randomUUID();
  const key = `previews/${id}/original.${EXTENSIONS[input.contentType]}`;
  const expiresAt = unpaidExpiry();

  await prisma.preview.create({
    data: { id, originalPhotoKey: key, expiresAt },
  });

  const uploadUrl = await createUploadUrl(key, input.contentType);
  return { previewId: id, uploadUrl, expiresAt: expiresAt.toISOString() };
}

export async function approvePreview(id: string) {
  const preview = await prisma.preview.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!preview) throw new PreviewNotFoundError();

  assertTransition(preview.status, PreviewStatus.APPROVED);

  // Alleen updaten als de status sinds het lezen niet veranderd is.
  const { count } = await prisma.preview.updateMany({
    where: { id, status: preview.status },
    data: { status: PreviewStatus.APPROVED },
  });
  if (count === 0) {
    throw new InvalidTransitionError(preview.status, PreviewStatus.APPROVED);
  }

  return { previewId: id, status: PreviewStatus.APPROVED };
}

export async function generatePose(id: string) {
  const preview = await prisma.preview.findUnique({ where: { id } });
  if (!preview) throw new PreviewNotFoundError(id);

  assertTransition(preview.status, PreviewStatus.GENERATING_POSE);

  const originalKey = preview.originalPhotoKey;
  if (!originalKey) throw new PreviewConflictError("No original photo");
  if (preview.poseAttempts >= MAX_POSE_ATTEMPTS) {
    throw new PreviewConflictError("Max pose attempts reached");
  }

  const claimed = await prisma.preview.updateMany({
    where: { id, status: preview.status },
    data: {
      status: PreviewStatus.GENERATING_POSE,
      error: null,
      poseAttempts: { increment: 1 },
    },
  });
  if (claimed.count === 0)
    throw new PreviewConflictError("Already being processed");

  try {
    const original = await getObject(originalKey);
    const pose = await geminiGeneratePose({
      image: original,
      mimeType: mimeTypeForKey(originalKey),
    });

    const key = poseImageKey(id, pose.mimeType);
    await putObject(key, pose.image, pose.mimeType);

    return await prisma.preview.update({
      where: { id },
      data: { status: PreviewStatus.POSE_READY, poseImageKey: key },
    });
  } catch (err) {
    await prisma.preview.updateMany({
      where: { id, status: PreviewStatus.GENERATING_POSE },
      data: { status: PreviewStatus.FAILED, error: toErrorMessage(err) },
    });
    throw err;
  }
}

function signedUrlOrNull(key: string | null) {
  return key ? createDownloadUrl(key) : Promise.resolve(null);
}

export async function getPreviewForAdmin(
  id: string,
): Promise<AdminPreviewDetail | null> {
  const preview = await prisma.preview.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      email: true,
      error: true,
      shopifyOrderId: true,
      createdAt: true,
      originalPhotoKey: true,
      poseImageKey: true,
      glbKey: true,
      poseAttempts: true,
    },
  });
  if (!preview) return null;

  const [originalPhotoUrl, poseImageUrl, glbUrl] = await Promise.all([
    signedUrlOrNull(preview.originalPhotoKey),
    signedUrlOrNull(preview.poseImageKey),
    signedUrlOrNull(preview.glbKey),
  ]);

  return {
    id: preview.id,
    status: preview.status,
    email: preview.email,
    error: preview.error,
    shopifyOrderId: preview.shopifyOrderId,
    createdAt: preview.createdAt.toISOString(),
    originalPhotoUrl,
    poseImageUrl,
    glbUrl,
    canApprove: canTransition(preview.status, PreviewStatus.APPROVED),
    canGeneratePose: canTransition(
      preview.status,
      PreviewStatus.GENERATING_POSE,
    ),
    poseAttemptsLeft: Math.max(0, MAX_POSE_ATTEMPTS - preview.poseAttempts),
  };
}

const REVIEW_LIST_LIMIT = 100;

const REVIEWABLE_STATUSES = [
  ...new Set([
    ...statusesThatCanTransitionTo(PreviewStatus.GENERATING_POSE),
    ...statusesThatCanTransitionTo(PreviewStatus.APPROVED),
  ]),
];

export async function listPreviewsForReview(): Promise<AdminPreviewListItem[]> {
  const previews = await prisma.preview.findMany({
    where: { status: { in: REVIEWABLE_STATUSES } },
    orderBy: { createdAt: "asc" },
    take: REVIEW_LIST_LIMIT,
    select: {
      id: true,
      status: true,
      email: true,
      error: true,
      createdAt: true,
    },
  });

  return previews.map((preview) => ({
    id: preview.id,
    status: preview.status,
    email: preview.email,
    error: preview.error,
    createdAt: preview.createdAt.toISOString(),
  }));
}
