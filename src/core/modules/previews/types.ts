import { z } from "zod";
import { MAX_ANIMAL_PROMPT_LENGTH, MAX_PROMPT_LENGTH } from "@/data/prompts";
import type { PoseSource, PreviewStatus } from "@/db/client";
import type { BatchStatus, OrderStatus } from "@/db/generated/enums";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_PRINT_FILE_BYTES,
  MAX_UPLOAD_BYTES,
  MAX_PHOTOS_PER_PREVIEW,
} from "@/data/uploads";
import { animalOptionSchema } from "@/core/modules/animals/types";
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
  // Only with APPROVED: downloaded and in Blender (Processed) instead of still to download (Goedgekeurd).
  inBlender: z.boolean().default(false),
  reason: z.string().trim().min(3).max(500),
});

// An own 3D model: one zip, the same size limit as a print zip from Blender.
export const ownModelUploadSchema = z.object({
  size: z.number().int().positive().max(MAX_PRINT_FILE_BYTES),
  printReady: z.boolean().default(false),
});

export const confirmOwnModelSchema = z.object({
  key: z.string().min(1).max(300),
  printReady: z.boolean().default(false),
});

// A well-formed code; whether it's in the animal list is checked in the service.
export const animalTypeSchema = z.object({
  animalType: animalOptionSchema.shape.code,
});

export type CreateUploadInput = z.infer<typeof createUploadSchema>;

export type PhotoInput = z.infer<typeof photoInputSchema>;
export type StatusOverrideInput = z.input<typeof statusOverrideSchema>;

export const photoInPromptSchema = z.object({ inPrompt: z.boolean() });

export type AdminPhoto = {
  id: string;
  url: string; // signed URL, kort geldig
  uploadedBy: string | null; // null = klant
  inPrompt: boolean; // gaat mee naar Nano Banana bij een nieuwe pose
};

/** One pose image of a preview: a generated attempt or an admin's upload. */
export type AdminPoseCandidate = {
  id: string;
  url: string; // signed URL, kort geldig
  source: PoseSource;
  label: string; // "Poging 2" of "Eigen pose"
  createdBy: string | null; // null = de pipeline
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  current: boolean; // de huidige pose (Preview.poseImageKey)
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
  // De betaalde order (null voor testpreviews en nieuwe collectibles).
  order: { id: string; number: string; status: OrderStatus; batchStatus: BatchStatus | null; notes: string | null } | null;
  /** De basisnaam van de printbestanden: PAL-PLY1042-01-P-RING-KAT, COL-007-HOND of PRV-A3F9C2E1. */
  printName: string;
  quantity: number; // aantal exemplaren in de order
  createdAt: string; // ISO-string: Date gaat niet zuiver van server naar client
  photos: AdminPhoto[];
  canAddPhoto: boolean;
  /** Keychain or figure on the open order, which an admin can change on request; locked once the order is at JLC. */
  edition: { edition: string; attachment: string | null; locked: boolean } | null;
  statusChanges: AdminStatusChange[];
  poseImageUrl: string | null;
  /** Every pose so far, oldest first, to compare and approve one of them. */
  poseCandidates: AdminPoseCandidate[];
  canApprovePose: boolean;
  canUploadPose: boolean;
  uploadedPosesLeft: number;
  glbUrl: string | null;
  /** The OBJ and its texture, for the viewer when there's no GLB (an own model can come without one). */
  objModelUrls: { obj: string; texture: string } | null;
  /** An own 3D model can be uploaded instead of Meshy's (also on an unpaid manual order: it waits for the payment). */
  canUploadModel: boolean;
  hasModel: boolean;
  /** Approved and downloaded: in Blender (Processed) rather than still to download (Goedgekeurd). */
  inBlender: boolean;
  /** The print-ready zip from Blender (or an own print-ready model) is there: what a batch sends to JLC. */
  hasProcessedFile: boolean;
  meshyTaskId: string | null;
  meshyProgress: MeshyProgress | null; // alleen terwijl het model gemaakt wordt
  canApprove: boolean;
  canGeneratePose: boolean;
  poseAttemptsLeft: number;
  canStartModel: boolean;
  canSyncModel: boolean;
  animalType: string | null; // null = nog niet gekozen, anders een code uit ANIMAL_TYPE_CODES
  // Gemaakt voor een nieuwe collectible (backoffice-order): de collectible die er al van gemaakt is, en of het kan.
  forCollectible: boolean;
  collectibleId: string | null;
  /** Print-ready, but its model isn't on the collectible (the automatic copy failed): offer to retry. */
  canAttachModel: boolean;
  /** The prompt the next pose uses: the admin's own for a collectible, else the one from the settings. */
  prompt: string;
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
  orderNumber: string | null;
  printName: string;
  forCollectible: boolean; // een nieuwe collectible, los van een order
  quantity: number;
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

export const promptOverrideSchema = z.object({
  prompt: z.string().trim().min(1).max(MAX_PROMPT_LENGTH + MAX_ANIMAL_PROMPT_LENGTH),
});
