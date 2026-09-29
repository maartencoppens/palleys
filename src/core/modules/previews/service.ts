import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/db/client";
import { createUploadUrl } from "@/core/networking/external/storage-client";
import { unpaidExpiry } from "./utils";
import type { CreateUploadInput } from "./types";

const EXTENSIONS: Record<CreateUploadInput["contentType"], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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
