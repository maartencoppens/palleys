import "server-only";
import { randomUUID } from "node:crypto";
import { prisma, PreviewStatus } from "@/db/client";
import {
  createDownloadUrl,
  createUploadUrl,
} from "@/core/networking/external/storage-client";
import {
  assertTransition,
  canTransition,
  InvalidTransitionError,
  statusesThatCanTransitionTo,
} from "./status";
import { unpaidExpiry } from "./utils";
import type {
  AdminPreviewDetail,
  AdminPreviewListItem,
  CreateUploadInput,
} from "./types";

const EXTENSIONS: Record<CreateUploadInput["contentType"], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class PreviewNotFoundError extends Error {}

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
  };
}

const REVIEW_LIST_LIMIT = 100;

export async function listPreviewsForReview(): Promise<AdminPreviewListItem[]> {
  const previews = await prisma.preview.findMany({
    where: {
      status: { in: statusesThatCanTransitionTo(PreviewStatus.APPROVED) },
    },
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
