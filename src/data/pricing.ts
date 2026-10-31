// Prices the shop charges, in euro cents, VAT included. The ONLY source of truth for amounts:
// the client never sends a price, every total is computed server-side from this file.
// No server-only imports: the configurator and cart show the same numbers.
import type { ProductType } from "./products";
import type { KeychainSize } from "./sizes";

export const CURRENCY = "EUR";

// Belgian VAT, in basis points (2100 = 21%). Per-country rates come with OSS (phase 8).
export const VAT_RATE_BASIS_POINTS = 2100;

// Price per product type × size. Every size listed in data/sizes.ts needs a price here.
export const UNIT_PRICE_CENTS: Record<ProductType, Record<KeychainSize, number>> = {
  keychain: { M: 2799 },
  figurine: { M: 2799 },
};

// Most copies of one Palley per order line, and most lines per order (one line per pet).
export const MAX_LINE_QUANTITY = 10;
export const MAX_ORDER_LINES = 10;
