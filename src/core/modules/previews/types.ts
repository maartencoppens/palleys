import { z } from "zod";

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const createUploadSchema = z.object({
  contentType: z.enum(ALLOWED_MIME_TYPES),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export type CreateUploadInput = z.infer<typeof createUploadSchema>;
