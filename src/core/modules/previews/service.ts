import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/db/client";
import { createUploadUrl } from "@/core/networking/external/storage-client";
import { PREVIEW_RETENTION_DAYS } from "@/data/retention";
import type { CreateUploadInput } from "./types";

const EXTENSIONS: Record<CreateUploadInput["contentType"], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function createPreview(input: CreateUploadInput) {
  const id = randomUUID();
  const key = `previews/${id}/original.${EXTENSIONS[input.contentType]}`;
  const expiresAt = new Date(
    Date.now() + PREVIEW_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.preview.create({
    data: { id, originalPhotoKey: key, expiresAt },
  });

  const uploadUrl = await createUploadUrl(key, input.contentType);
  return { previewId: id, uploadUrl };
}
