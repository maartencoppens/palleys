// Hoe en hoe lang bestanden in R2 bereikbaar zijn.
export const UPLOAD_URL_TTL_SECONDS = 300;
export const DOWNLOAD_URL_TTL_SECONDS = 300;

// Alle bestanden van een preview staan onder previews/<id>/...
export const PREVIEW_KEY_PREFIX = "previews";

// Keys blijven op UUID's. Leesbare namen (PAL-PLY1042-01-P-RING-KAT.obj) krijgt een bestand pas bij het downloaden:
// zie core/utils/naming.ts.
