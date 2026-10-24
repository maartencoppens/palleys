import { z } from "zod";
import type { PreviewStatus } from "@/db/client";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_PHOTOS_PER_PREVIEW,
} from "@/data/uploads";
import { ANIMAL_TYPE_CODES } from "@/data/animals";
import { ADMIN_SETTABLE_STATUSES } from "./status";

export const photoInputSchema = z.object({
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

// De klant uploadt 1 tot MAX_PHOTOS_PER_PREVIEW foto's in één keer.
export const createUploadSchema = z.object({
  photos: z.array(photoInputSchema).min(1).max(MAX_PHOTOS_PER_PREVIEW),
});

export const confirmPhotoSchema = z.object({ key: z.string().min(1).max(300) });

export const statusOverrideSchema = z.object({
  status: z.enum(
    ADMIN_SETTABLE_STATUSES as [PreviewStatus, ...PreviewStatus[]],
  ),
  reason: z.string().trim().min(3).max(500),
});

export const animalTypeSchema = z.object({
  animalType: z.enum(ANIMAL_TYPE_CODES),
});

export type CreateUploadInput = z.infer<typeof createUploadSchema>;

export type PhotoInput = z.infer<typeof photoInputSchema>;
export type StatusOverrideInput = z.infer<typeof statusOverrideSchema>;

export type AdminPhoto = {
  id: string;
  url: string; // signed URL, kort geldig
  uploadedBy: string | null; // null = klant
};

export type AdminStatusChange = {
  fromStatus: PreviewStatus;
  toStatus: PreviewStatus;
  reason: string;
  changedBy: string;
  createdAt: string;
};

// Live stand van de Meshy-taak, rechtstreeks bij Meshy opgevraagd.
export type MeshyProgress = {
  status: string;
  progress: number | null;
  precedingTasks: number | null;
};

export type AdminPreviewDetail = {
  id: string;
  status: PreviewStatus;
  email: string | null;
  error: string | null;
  shopifyOrderId: string | null;
  createdAt: string; // ISO-string: Date gaat niet zuiver van server naar client
  photos: AdminPhoto[];
  canAddPhoto: boolean;
  canDeletePhoto: boolean;
  statusChanges: AdminStatusChange[];
  poseImageUrl: string | null;
  glbUrl: string | null;
  meshyTaskId: string | null;
  meshyProgress: MeshyProgress | null; // alleen terwijl het model gemaakt wordt
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

export type ReviewListItem = AdminPreviewListItem & {
  photoUrls: string[];
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
