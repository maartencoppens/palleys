import "server-only";
import { randomUUID } from "node:crypto";
import { prisma, PreviewStatus } from "@/db/client";
import { createUploadUrl } from "@/core/networking/external/storage-client";
import { assertTransition, InvalidTransitionError } from "./status";
import { unpaidExpiry } from "./utils";
import type { CreateUploadInput } from "./types";

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
