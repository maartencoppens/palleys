// ENIGE plek om de bewaartermijn van niet-betaalde uploads aan te passen.
// Gebruikt door de backend (expiresAt in de database) en de frontend
// (winkelmand-geheugen en teksten in de UI). Startwaarde, bijstellen met echte data.
export const UNPAID_UPLOAD_TTL_DAYS = 7;

export const UNPAID_UPLOAD_TTL_MS =
  UNPAID_UPLOAD_TTL_DAYS * 24 * 60 * 60 * 1000;
