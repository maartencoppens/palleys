// Collectibles: premade, non-personalised models managed in /admin/settings/collectibles. No server-only imports.
import type { Edition } from "./options";

export const COLLECTIBLE_KEY_PREFIX = "collectibles";
export const COLLECTIBLE_IMAGE_ROUTE = "/api/collectibles/images";
// Every collectible is a keychain for now; its order line leaves the edition empty.
export const COLLECTIBLE_EDITION: Edition = "keychain";

// Every upload is converted to WebP at this size, without its metadata.
export const COLLECTIBLE_IMAGE_MAX_PX = 1600;
export const COLLECTIBLE_IMAGE_QUALITY = 88;

// How many the homepage shows; the rest is on /shop.
export const HOME_COLLECTIBLE_LIMIT = 4;

// The starting price of a collectible made from a backoffice order; the admin sets the real one.
export const DEFAULT_COLLECTIBLE_PRICE_CENTS = 2399;

export const COLLECTIBLE_LIMITS = { name: 80, description: 1000, tag: 30 } as const;

