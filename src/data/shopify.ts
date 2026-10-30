// Static Shopify config shared by the cart and the orders webhook. No server-only imports.

/** Market context for every Storefront call: Belgian prices/taxes and a Dutch checkout. */
export const SHOPIFY_CONTEXT = { country: "BE", language: "NL" } as const;

/**
 * Line item attributes. Keys starting with "_" are hidden from the shopper at checkout but
 * still arrive on the order (webhook + Shopify admin), which is what we want for the preview ID.
 */
export const LINE_ATTRIBUTES = {
  previewId: "_previewId",
  notes: "Opmerking",
} as const;

export const MAX_NOTES_LENGTH = 500;

/** Most copies of one Palley a shopper can put in the cart. */
export const MAX_LINE_QUANTITY = 10;

/** httpOnly cookie that remembers the Shopify cart ID; the cart itself lives at Shopify. */
export const CART_COOKIE = "palleys_cart";
// Shopify keeps an untouched cart for about 10 days; the cookie doesn't need to outlive that.
export const CART_COOKIE_MAX_AGE_SECONDS = 10 * 24 * 60 * 60;

/** How long resolved variant IDs are kept in memory before asking Shopify again. */
export const VARIANT_CACHE_TTL_MS = 10 * 60 * 1000;

/** Tag put on a Shopify order whose preview couldn't be marked as paid, so it stands out in the admin. */
export const ORDER_PROBLEM_TAG = "palleys-preview-probleem";
