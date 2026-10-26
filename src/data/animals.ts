// Diersoorten die de admin kan kiezen. Nieuwe soort = één regel erbij.
// `code` komt in de bestandsnaam (PAL-...-CAT-...): hoofdletters, geen spaties.
export const ANIMAL_TYPES = [
  { code: "KAT", label: "Kat" },
  { code: "HOND", label: "Hond" },
  { code: "SCHILDPAD", label: "Schildpad" },
  { code: "CAVIA", label: "Cavia" },
  { code: "HAMSTER", label: "Hamster" },
  { code: "KONIJN", label: "Konijn" },
  { code: "MUIS", label: "Muis" },
  { code: "RAT", label: "Rat" },
  { code: "KAMELEON", label: "Kameleon" },
  { code: "SLANG", label: "Slang" },
  { code: "EGEL", label: "Egel" },
] as const;

export type AnimalType = (typeof ANIMAL_TYPES)[number]["code"];

export const ANIMAL_TYPE_CODES = ANIMAL_TYPES.map((a) => a.code) as [
  AnimalType,
  ...AnimalType[],
];
