// Starting prices, in euro cents: what the customer pays, we charge no VAT. The live prices are set in /admin/settings/products; these apply until
// then. The client never sends a price: every total is computed server-side (core/modules/catalog/utils.ts).
// No server-only imports.
import type { ProductType } from "./products";
import type { KeychainSize } from "./sizes";

export const CURRENCY = "EUR";

// VAT in basis points (2100 = 21%). Zero: as a student business in Unizo's Step Up programme, Palleys is exempt and charges none.
// LEGAL-REVIEW: leaving the programme means this rate, the texts about it (core/locale/messages) and the legal pages.
export const VAT_RATE_BASIS_POINTS = 0;

// Price per product type × size. Every size listed in data/sizes.ts needs a price here.
export const UNIT_PRICE_CENTS: Record<ProductType, Record<KeychainSize, number>> = {
  keychain: { M: 2799 },
  figurine: { M: 2799 },
};

// Highest price an admin can enter for one product, as a guard against typos (€ 500,00).
export const MAX_PRODUCT_PRICE_CENTS = 50_000;

// Most copies of one Palley per order line, and most lines per order (one line per pet).
export const MAX_LINE_QUANTITY = 10;
export const MAX_ORDER_LINES = 10;
