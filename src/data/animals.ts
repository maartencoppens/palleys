// The animals of the personalised Palley as they were before they could be managed: the starting list. The live list
// is set in /admin/settings/products and read through the catalog settings. No server-only imports.
//   value  in the cart and on the order ("dog"), never changes
//   code   in the product code (P-RING-HOND), the print file name and the AI prompt, never changes
//   labels what the shop shows, per language
export const DEFAULT_ANIMALS = [
  { value: "dog", code: "HOND", labels: { nl: "Hond", en: "Dog" } },
  { value: "cat", code: "KAT", labels: { nl: "Kat", en: "Cat" } },
  { value: "rabbit", code: "KONIJN", labels: { nl: "Konijn", en: "Rabbit" } },
  { value: "guinea-pig", code: "CAVIA", labels: { nl: "Cavia", en: "Guinea pig" } },
  { value: "hamster", code: "HAMSTER", labels: { nl: "Hamster", en: "Hamster" } },
  { value: "mouse", code: "MUIS", labels: { nl: "Muis", en: "Mouse" } },
  { value: "rat", code: "RAT", labels: { nl: "Rat", en: "Rat" } },
  { value: "hedgehog", code: "EGEL", labels: { nl: "Egel", en: "Hedgehog" } },
  { value: "turtle", code: "SCHILDPAD", labels: { nl: "Schildpad", en: "Tortoise" } },
  { value: "chameleon", code: "KAMELEON", labels: { nl: "Kameleon", en: "Chameleon" } },
  { value: "snake", code: "SLANG", labels: { nl: "Slang", en: "Snake" } },
];

export const ANIMAL_LIMITS = { items: 40, label: 40 } as const;
