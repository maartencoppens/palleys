// Batches for JLC and the production pages. No server-only imports.

// Most orders in one batch, as a guard on the API.
export const MAX_BATCH_ORDERS = 200;
// Orders per page in "Afgerond".
export const FINISHED_PAGE_SIZE = 25;
// Longest message in a pickup update mail, per language.
export const PICKUP_UPDATE_MAX_LENGTH = 2000;
