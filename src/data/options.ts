/*
 * Shopify product "Gepersonaliseerde Palley" (handle gepersonaliseerde-palley), from the product export.
 * Two options make 22 variants: Uitvoering (with/without keychain) × Dier (11 animals). Every variant
 * costs €27,99 and has SKU PAL-GP-{KEY|FIG}-{ANIMAL}. Labels are what the site shows; `shopifyValue`
 * is the exact option value in Shopify, `skuCode` the matching SKU part.
 */
export const SHOPIFY_PRODUCT_HANDLE = "gepersonaliseerde-palley";
export const PALLEY_PRICE = 27.99;
export const PALLEY_SIZE = "Ongeveer 3,7 cm aan de langste kant";

export type Option<Value extends string> = { value: Value; label: string; shopifyValue: string; skuCode: string };

// Option1 "Uitvoering".
export const editions = [
  { value: "keychain", label: "Met sleutelhanger", shopifyValue: "Met sleutelhanger", skuCode: "KEY" },
  { value: "figure", label: "Enkel figuurtje", shopifyValue: "Zonder sleutelhanger", skuCode: "FIG" },
] as const satisfies readonly Option<string>[];
export type Edition = (typeof editions)[number]["value"];

// Option2 "Dier", ordered by how common the pet is rather than as in the export.
export const animals = [
  { value: "dog", label: "Hond", shopifyValue: "Hond", skuCode: "DOG" },
  { value: "cat", label: "Kat", shopifyValue: "Kat", skuCode: "CAT" },
  { value: "rabbit", label: "Konijn", shopifyValue: "Konijn", skuCode: "RABBIT" },
  { value: "guinea-pig", label: "Cavia", shopifyValue: "Cavia", skuCode: "GUINEA_PIG" },
  { value: "hamster", label: "Hamster", shopifyValue: "Hamster", skuCode: "HAMSTER" },
  { value: "mouse", label: "Muis", shopifyValue: "Muis", skuCode: "MOUSE" },
  { value: "rat", label: "Rat", shopifyValue: "Rat", skuCode: "RAT" },
  { value: "hedgehog", label: "Egel", shopifyValue: "Egel", skuCode: "HEDGEHOG" },
  { value: "turtle", label: "Schildpad", shopifyValue: "Schildpad", skuCode: "TURTLE" },
  { value: "chameleon", label: "Kameleon", shopifyValue: "Kameleon", skuCode: "CHAMELEON" },
  { value: "snake", label: "Slang", shopifyValue: "Slang", skuCode: "SNAKE" },
] as const satisfies readonly Option<string>[];
export type Animal = (typeof animals)[number]["value"];

export const findOption = <O extends Option<string>>(options: readonly O[], value: string | null) =>
  options.find((option) => option.value === value) ?? null;

/** The Shopify variant for a choice: what the cart needs later. */
export const getVariant = (edition: Edition, animal: Animal) => {
  const editionOption = findOption(editions, edition)!;
  const animalOption = findOption(animals, animal)!;
  return {
    sku: `PAL-GP-${editionOption.skuCode}-${animalOption.skuCode}`,
    options: { Uitvoering: editionOption.shopifyValue, Dier: animalOption.shopifyValue },
  };
};

// Shopify metafield custom.return_note.
export const RETURN_NOTE =
  "Elke Palley wordt speciaal voor jouw huisdier gemaakt, dus retourneren kan niet. Kwam hij beschadigd aan of is het niet wat je bestelde? Dan lossen we het op.";

export const MAX_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"];
export const ACCEPTED_PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".heic", ".heif"];

/** How sharp an uploaded photo looks, judged by its shortest side in pixels. */
export type PhotoQuality = "great" | "ok" | "small" | "unknown";

export const photoQualityMessage: Record<PhotoQuality, string> = {
  great: "Top, mooi scherp!",
  ok: "Ziet er goed uit.",
  small: "Deze foto is vrij klein – een scherpere geeft een mooier resultaat.",
  unknown: "We checken de kwaliteit voor je.",
};

export const qualityFromSize = (width: number, height: number): PhotoQuality => {
  const shortestSide = Math.min(width, height);
  if (shortestSide >= 1000) return "great";
  if (shortestSide >= 600) return "ok";
  return "small";
};

export type StepId = "choose" | "upload" | "order";
export type StepStatus = "done" | "active" | "upcoming";

export const steps: { id: StepId; label: string; title: string }[] = [
  { id: "choose", label: "Kiezen", title: "Kies je Palley" },
  { id: "upload", label: "Uploaden", title: "Upload je foto’s" },
  { id: "order", label: "Bestellen", title: "Nakijken & bestellen" },
];
