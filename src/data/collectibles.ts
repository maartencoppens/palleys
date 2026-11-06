// Collectibles: premade, non-personalised models managed in /admin/settings/collectibles. No server-only imports.
export const COLLECTIBLE_KEY_PREFIX = "collectibles";
export const COLLECTIBLE_IMAGE_ROUTE = "/api/collectibles/images";
export const COLLECTIBLE_SKU_PREFIX = "PAL-COL";

// Every upload is converted to WebP at this size, without its metadata.
export const COLLECTIBLE_IMAGE_MAX_PX = 1600;
export const COLLECTIBLE_IMAGE_QUALITY = 88;

// How many the homepage shows; the rest is on /shop.
export const HOME_COLLECTIBLE_LIMIT = 4;

export const COLLECTIBLE_LIMITS = { name: 80, description: 1000, tag: 30 } as const;

