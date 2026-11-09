// ENIGE plek om de bewaartermijn van niet-betaalde uploads aan te passen.
// Gebruikt door de backend (expiresAt in de database) en de frontend
// (winkelmand-geheugen en teksten in de UI). Startwaarde, bijstellen met echte data.
export const UNPAID_UPLOAD_TTL_DAYS = 7;

export const UNPAID_UPLOAD_TTL_MS =
  UNPAID_UPLOAD_TTL_DAYS * 24 * 60 * 60 * 1000;

// LEGAL-REVIEW: the retention periods of the privacy policy (art. 6), applied by the cron (core/modules/retention).
// Photos of the pet, the pose and the in-between models: this long after the order was delivered, picked up or refunded.
export const PHOTO_RETENTION_DAYS = 42;
// The print-ready model, for reprinting under the guarantee: this long after delivery.
export const PRINT_MODEL_RETENTION_YEARS = 2;
// Previews handled per cron run, per rule, so one run stays short.
export const RETENTION_BATCH_SIZE = 50;
