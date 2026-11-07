import type { Locale } from "@/core/locale/config";
import type { AnimalOption } from "./types";

/* Looking animals up in the live list, and naming a new one. Pure, also used in the browser. */

export const findAnimal = (list: readonly AnimalOption[], value: string | null) =>
  list.find((animal) => animal.value === value) ?? null;

export const findAnimalByCode = (list: readonly AnimalOption[], code: string | null) =>
  list.find((animal) => animal.code === code) ?? null;

/** The animal's name per language, for a cart line or a mail. Null when the animal is no longer in the list. */
export const animalLabels = (list: readonly AnimalOption[], value: string | null): Record<Locale, string> | null =>
  findAnimal(list, value)?.labels ?? null;

const slug = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);

/**
 * A new animal from its names: "Papegaai" becomes value "papegaai" and code "PAPEGAAI". A name that is taken gets a
 * number. Null when the Dutch name has no letters or digits to make one from.
 */
export function newAnimal(labels: Record<Locale, string>, existing: readonly AnimalOption[]): AnimalOption | null {
  const base = slug(labels.nl);
  if (!base) return null;
  let value = base;
  for (let n = 2; existing.some((animal) => animal.value === value || animal.code === toCode(value)); n++) value = `${base}-${n}`;
  return { value, code: toCode(value), labels };
}

const toCode = (value: string) => value.replaceAll("-", "").toUpperCase();
