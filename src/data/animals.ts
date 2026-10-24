// Diersoorten die de admin kan kiezen. Nieuwe soort = één regel erbij.
// `code` komt in de bestandsnaam (PAL-...-CAT-...): hoofdletters, geen spaties.
export const ANIMAL_TYPES = [
  { code: "CAT", label: "Kat" },
  { code: "DOG", label: "Hond" },
] as const;

export type AnimalType = (typeof ANIMAL_TYPES)[number]["code"];

export const ANIMAL_TYPE_CODES = ANIMAL_TYPES.map((a) => a.code) as [
  AnimalType,
  ...AnimalType[],
];
