/*
 * The choices of the personalised Palley. Labels are what the backoffice and the order title show (Dutch); the shop's
 * are in core/locale/messages. The product code is built from these in core/utils/naming.ts.
 */
import { ALLOWED_IMAGE_TYPES, MAX_PHOTOS_PER_PREVIEW, MAX_UPLOAD_BYTES } from "./uploads";

export const editions = [
  { value: "keychain", label: "Met sleutelhanger" },
  { value: "figure", label: "Enkel figuurtje" },
] as const;
export type Edition = (typeof editions)[number]["value"];

// How a keychain goes on the keys: a Palley "Met sleutelhanger" and every collectible. No price difference.
export const attachments = [
  { value: "clip", label: "Klemmetje" },
  { value: "key-ring", label: "Sleutelring" },
] as const;
export type Attachment = (typeof attachments)[number]["value"];
export const DEFAULT_ATTACHMENT: Attachment = "clip";

// The starting text of the return note (Teksten in the backoffice).
export const RETURN_NOTE =
  "Elke Palley wordt speciaal voor jouw huisdier gemaakt, dus retourneren kan niet. Kwam hij beschadigd aan of is het niet wat je bestelde? Dan lossen we het op.";

// Same limits as the upload API (data/uploads.ts), so the browser never accepts what the server refuses.
// No HEIC: the AI pipeline can't read it. iPhones convert HEIC to JPEG when the picker doesn't accept it.
export const MAX_PHOTOS = MAX_PHOTOS_PER_PREVIEW;
export const MAX_PHOTO_BYTES = MAX_UPLOAD_BYTES;
export const ACCEPTED_PHOTO_TYPES: readonly string[] = ALLOWED_IMAGE_TYPES;
export const ACCEPTED_PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
export const MAX_PHOTO_SIZE_LABEL = `${MAX_UPLOAD_BYTES / 1024 / 1024} MB`;

/** How sharp an uploaded photo looks, judged by its shortest side in pixels. */
export type PhotoQuality = "great" | "ok" | "small" | "unknown";

export const qualityFromSize = (width: number, height: number): PhotoQuality => {
  const shortestSide = Math.min(width, height);
  if (shortestSide >= 1000) return "great";
  if (shortestSide >= 600) return "ok";
  return "small";
};

export type StepId = "choose" | "upload" | "order";
export type StepStatus = "done" | "active" | "upcoming";

export const STEP_IDS: StepId[] = ["choose", "upload", "order"];
