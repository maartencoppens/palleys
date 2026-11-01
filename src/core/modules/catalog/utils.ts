import { animals, editions, type Animal, type Edition } from "@/data/options";
import { PRODUCT_TYPES, SPECIES, buildSku, type ProductType, type Species } from "@/data/products";
import { UNIT_PRICE_CENTS, VAT_RATE_BASIS_POINTS } from "@/data/pricing";
import { PACKAGING, PARCEL_BY_SIZE } from "@/data/shipping";
import { KEYCHAIN_SIZES, type KeychainSize } from "@/data/sizes";

/*
 * Pure catalog and price functions. Amounts are integer cents, VAT included; nothing here trusts the client.
 * Edition/Animal are the configurator's values (data/options.ts), ProductType/Species the SKU's (data/products.ts).
 */

export type Variant = { sku: string; type: ProductType; species: Species; size: KeychainSize };

const EDITION_TYPE: Record<Edition, ProductType> = { keychain: "keychain", figure: "figurine" };
const animalSpecies = (animal: Animal): Species => (animal === "guinea-pig" ? "guinea_pig" : animal);

export const DEFAULT_SIZE: KeychainSize = "M";

export function isSize(value: string): value is KeychainSize {
  return Object.hasOwn(KEYCHAIN_SIZES, value);
}

/** The variant for a configurator choice. */
export function variantFor(edition: Edition, animal: Animal, size: KeychainSize = DEFAULT_SIZE): Variant {
  const type = EDITION_TYPE[edition];
  const species = animalSpecies(animal);
  return { sku: buildSku(type, species), type, species, size };
}

/** Looks a SKU back up (PAL-GP-KEY-HOND + size). Null for anything we don't sell. */
export function getVariant(sku: string, size: string = DEFAULT_SIZE): Variant | null {
  if (!isSize(size)) return null;
  for (const type of PRODUCT_TYPES) {
    for (const species of SPECIES) {
      if (buildSku(type, species) === sku) return { sku, type, species, size };
    }
  }
  return null;
}

/** The price of a variant. `prices` are the live prices from the settings; without them the starting prices apply. */
export function priceFor(variant: Pick<Variant, "type" | "size">, prices?: Record<ProductType, number>): number {
  const price = prices?.[variant.type] ?? UNIT_PRICE_CENTS[variant.type][variant.size];
  if (!Number.isInteger(price) || price <= 0) throw new Error(`No price for ${variant.type} ${variant.size}`);
  return price;
}

/** What one edition costs at the live prices, for the configurator. */
export function editionPriceCents(edition: Edition, prices: Record<ProductType, number>) {
  return prices[EDITION_TYPE[edition]];
}

/** Shopper-facing name of a line, e.g. "Palley Hond · Met sleutelhanger". */
export function variantLabel(edition: Edition, animal: Animal) {
  const animalLabel = animals.find((a) => a.value === animal)?.label ?? animal;
  const editionLabel = editions.find((e) => e.value === edition)?.label ?? edition;
  return { animal: animalLabel, edition: editionLabel, title: `Palley ${animalLabel}` };
}

/** VAT contained in a VAT-inclusive amount, rounded to the cent: 2799 at 21% → 486. */
export function vatIncluded(grossCents: number, rateBasisPoints: number = VAT_RATE_BASIS_POINTS) {
  return Math.round((grossCents * rateBasisPoints) / (10_000 + rateBasisPoints));
}

export type Totals = { subtotalCents: number; shippingCents: number; vatCents: number; totalCents: number };

export function computeTotals(lines: { unitCents: number; quantity: number }[], shippingCents: number): Totals {
  for (const line of lines) {
    if (!Number.isInteger(line.unitCents) || line.unitCents < 0) throw new Error("Invalid unit price");
    if (!Number.isInteger(line.quantity) || line.quantity < 1) throw new Error("Invalid quantity");
  }
  if (!Number.isInteger(shippingCents) || shippingCents < 0) throw new Error("Invalid shipping price");
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);
  const totalCents = subtotalCents + shippingCents;
  // Shipping follows the VAT rate of the goods, so VAT is taken over the whole total.
  return { subtotalCents, shippingCents, vatCents: vatIncluded(totalCents), totalCents };
}

/** Parcel for a set of Palleys: packaging plus every copy. */
export function parcelFor(items: { size: KeychainSize; quantity: number }[]) {
  const weightGrams = items.reduce(
    (sum, item) => sum + PARCEL_BY_SIZE[item.size].weightGrams * item.quantity,
    PACKAGING.weightGrams,
  );
  return { weightGrams, dimensionsCm: PACKAGING.dimensionsCm };
}
