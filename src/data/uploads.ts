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

// Hoeveel foto's van het dier mee naar Nano Banana gaan (en hoeveel een klant uploadt).
export const MAX_PHOTOS_PER_PREVIEW = 4;
// Hoeveel foto's een preview in totaal mag hebben: een admin kan er bijzetten en foto's uit de prompt halen zonder ze
// te verwijderen. Er gaan er nooit meer dan MAX_PHOTOS_PER_PREVIEW mee.
export const MAX_STORED_PHOTOS_PER_PREVIEW = 10;

// Verwerkte printbestanden uit Blender: één zip met OBJ + MTL + PNG.
export const PRINT_FILE_CONTENT_TYPE = "application/zip";
export const MAX_PRINT_FILE_BYTES = 200 * 1024 * 1024;
