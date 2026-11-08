// What a personalised Palley is priced as (data/pricing.ts). The product code is in core/utils/naming.ts.
export const PRODUCT_TYPES = ["keychain", "figurine"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];
