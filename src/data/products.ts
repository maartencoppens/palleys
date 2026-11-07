export const PRODUCT_HANDLE = "gepersonaliseerde-palley";

export const PRODUCT_TYPES = ["keychain", "figurine"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

const PRODUCT_TYPE_SKU_CODE: Record<ProductType, string> = {
  keychain: "KEY",
  figurine: "FIG",
};

/** PAL-GP-KEY-HOND: the product type and the animal's code (see core/modules/animals). */
export function buildSku(type: ProductType, animalCode: string): string {
  return `PAL-GP-${PRODUCT_TYPE_SKU_CODE[type]}-${animalCode}`;
}
