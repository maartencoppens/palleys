// Wat klanten mogen uploaden. Ook gebruikt in de browser: geen server-only imports.
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type ImageMimeType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const IMAGE_EXTENSIONS: Record<ImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Hoeveel foto's van het dier een preview mag hebben (klant + admin samen).
export const MAX_PHOTOS_PER_PREVIEW = 4;
