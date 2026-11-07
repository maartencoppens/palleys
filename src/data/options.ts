/*
 * Shopify product "Gepersonaliseerde Palley" (handle gepersonaliseerde-palley), from the product export.
 * Two options make 22 variants: Uitvoering (with/without keychain) × Dier (11 animals). Every variant
 * costs €27,99 and has SKU PAL-GP-{KEY|FIG}-{ANIMAL}. Labels are what the site shows; `shopifyValue`
 * is the exact option value in Shopify, `skuCode` the matching SKU part.
 */
import { buildSku, PRODUCT_HANDLE } from "./products";
import { ALLOWED_IMAGE_TYPES, MAX_PHOTOS_PER_PREVIEW, MAX_UPLOAD_BYTES } from "./uploads";

export const SHOPIFY_PRODUCT_HANDLE = PRODUCT_HANDLE;

export type Option<Value extends string> = { value: Value; label: string; shopifyValue: string; skuCode: string };

// Labels here are the backoffice's and the order title's, in Dutch; the shop's are in core/locale/messages.
// Option1 "Uitvoering".
export const editions = [
  { value: "keychain", label: "Met sleutelhanger", shopifyValue: "Met sleutelhanger", skuCode: "KEY" },
  { value: "figure", label: "Enkel figuurtje", shopifyValue: "Zonder sleutelhanger", skuCode: "FIG" },
] as const satisfies readonly Option<string>[];
export type Edition = (typeof editions)[number]["value"];

// How a keychain goes on the keys: a Palley "Met sleutelhanger" and every collectible. No SKU or price difference.
export const attachments = [
  { value: "clip", label: "Klemmetje" },
  { value: "key-ring", label: "Sleutelring" },
] as const;
export type Attachment = (typeof attachments)[number]["value"];
export const DEFAULT_ATTACHMENT: Attachment = "clip";

// Option2 "Dier" of the old Shopify product, only for the Shopify integration (orders from before our own checkout).
// The shop's animals are managed in the backoffice: see core/modules/animals.
export const shopifyAnimals = [
  { value: "dog", label: "Hond", shopifyValue: "Hond", skuCode: "HOND", animalType: "HOND" },
  { value: "cat", label: "Kat", shopifyValue: "Kat", skuCode: "KAT", animalType: "KAT" },
  { value: "rabbit", label: "Konijn", shopifyValue: "Konijn", skuCode: "KONIJN", animalType: "KONIJN" },
  { value: "guinea-pig", label: "Cavia", shopifyValue: "Cavia", skuCode: "CAVIA", animalType: "CAVIA" },
  { value: "hamster", label: "Hamster", shopifyValue: "Hamster", skuCode: "HAMSTER", animalType: "HAMSTER" },
  { value: "mouse", label: "Muis", shopifyValue: "Muis", skuCode: "MUIS", animalType: "MUIS" },
  { value: "rat", label: "Rat", shopifyValue: "Rat", skuCode: "RAT", animalType: "RAT" },
  { value: "hedgehog", label: "Egel", shopifyValue: "Egel", skuCode: "EGEL", animalType: "EGEL" },
  { value: "turtle", label: "Schildpad", shopifyValue: "Schildpad", skuCode: "SCHILDPAD", animalType: "SCHILDPAD" },
  { value: "chameleon", label: "Kameleon", shopifyValue: "Kameleon", skuCode: "KAMELEON", animalType: "KAMELEON" },
  { value: "snake", label: "Slang", shopifyValue: "Slang", skuCode: "SLANG", animalType: "SLANG" },
] as const satisfies readonly (Option<string> & { animalType: string })[];
export type ShopifyAnimal = (typeof shopifyAnimals)[number]["value"];

export const findOption = <O extends Option<string>>(options: readonly O[], value: string | null) =>
  options.find((option) => option.value === value) ?? null;

/** The Shopify variant for a choice: what the cart needs later. */
export const getVariant = (edition: Edition, animal: ShopifyAnimal) => {
  const editionOption = findOption(editions, edition)!;
  const animalOption = findOption(shopifyAnimals, animal)!;
  return {
    sku: buildSku(edition === "keychain" ? "keychain" : "figurine", animalOption.skuCode),
    options: { Uitvoering: editionOption.shopifyValue, Dier: animalOption.shopifyValue },
  };
};

// Shopify metafield custom.return_note.
export const RETURN_NOTE =
  "Elke Palley wordt speciaal voor jouw huisdier gemaakt, dus retourneren kan niet. Kwam hij beschadigd aan of is het niet wat je bestelde? Dan lossen we het op.";

// Same limits as the upload API (data/uploads.ts), so the browser never accepts what the server refuses.
// No HEIC: the AI pipeline can't read it. iPhones convert HEIC to JPEG when the picker doesn't accept it.
export const MAX_PHOTOS = MAX_PHOTOS_PER_PREVIEW;
export const MAX_PHOTO_BYTES = MAX_UPLOAD_BYTES;
export const ACCEPTED_PHOTO_TYPES: readonly string[] = ALLOWED_IMAGE_TYPES;
export const ACCEPTED_PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
export const MAX_PHOTO_SIZE_LABEL = `${MAX_UPLOAD_BYTES / 1024 / 1024} MB`;

/** How sharp an uploaded photo looks, judged by its shortest side in pixels. */
export type PhotoQuality = "great" | "ok" | "small" | "unknown";

export const qualityFromSize = (width: number, height: number): PhotoQuality => {
  const shortestSide = Math.min(width, height);
  if (shortestSide >= 1000) return "great";
  if (shortestSide >= 600) return "ok";
  return "small";
};

export type StepId = "choose" | "upload" | "order";
export type StepStatus = "done" | "active" | "upcoming";

export const STEP_IDS: StepId[] = ["choose", "upload", "order"];
