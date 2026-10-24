import { z } from "zod";
import type { PreviewStatus } from "@/db/client";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/data/uploads";
import { ANIMAL_TYPE_CODES, AnimalType } from "@/data/animals";

export const createUploadSchema = z.object({
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export const animalTypeSchema = z.object({
  animalType: z.enum(ANIMAL_TYPE_CODES),
});

export type CreateUploadInput = z.infer<typeof createUploadSchema>;

export type AdminPreviewDetail = {
  id: string;
  status: PreviewStatus;
  email: string | null;
  error: string | null;
  shopifyOrderId: string | null;
  createdAt: string; // ISO-string: Date gaat niet zuiver van server naar client
  originalPhotoUrl: string | null;
  poseImageUrl: string | null;
  glbUrl: string | null;
  canApprove: boolean;
  canGeneratePose: boolean;
  poseAttemptsLeft: number;
  canStartModel: boolean;
  canSyncModel: boolean;
  animalType: string | null; // null = nog niet gekozen, anders een code uit ANIMAL_TYPE_CODES
};

export type AdminPreviewListItem = {
  id: string;
  status: PreviewStatus;
  email: string | null;
  error: string | null;
  createdAt: string;
};

export type PreviewActionResult = {
  previewId: string;
  status: PreviewStatus;
};

// Eén model om te downloaden: de naam en een signed URL per bestand.
export type PrintDownload = {
  previewId: string;
  baseName: string;
  urls: { obj: string; mtl: string; texture: string }; // kort geldig
};

export type DashboardStats = {
  toReview: number;
  toDownload: number;
  failed: number;
  approved: number;
};

export type AdminDashboard = {
  stats: DashboardStats;
  query: string;
  results: AdminPreviewListItem[];
};
