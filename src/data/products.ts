export const PRODUCT_HANDLE = "gepersonaliseerde-palley";

export const SPECIES = [
  "cat",
  "dog",
  "turtle",
  "guinea_pig",
  "hamster",
  "rabbit",
  "mouse",
  "rat",
  "chameleon",
  "snake",
  "hedgehog",
] as const;
export type Species = (typeof SPECIES)[number];

export const PRODUCT_TYPES = ["keychain", "figurine"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

const SPECIES_SKU_CODE: Record<Species, string> = {
  cat: "KAT",
  dog: "HOND",
  turtle: "SCHILDPAD",
  guinea_pig: "CAVIA",
  hamster: "HAMSTER",
  rabbit: "KONIJN",
  mouse: "MUIS",
  rat: "RAT",
  chameleon: "KAMELEON",
  snake: "SLANG",
  hedgehog: "EGEL",
};

const PRODUCT_TYPE_SKU_CODE: Record<ProductType, string> = {
  keychain: "KEY",
  figurine: "FIG",
};

export function buildSku(type: ProductType, species: Species): string {
  return `PAL-GP-${PRODUCT_TYPE_SKU_CODE[type]}-${SPECIES_SKU_CODE[species]}`;
}
