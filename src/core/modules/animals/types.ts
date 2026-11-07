import { z } from "zod";
import { LOCALES, type Locale } from "@/core/locale/config";
import { ANIMAL_LIMITS } from "@/data/animals";

/*
 * An animal of the personalised Palley. `value` and `code` are fixed once it exists (carts, orders, SKUs and print
 * files refer to them), the labels can change. No server-only imports.
 */
export const animalOptionSchema = z.object({
  value: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(40),
  code: z.string().regex(/^[A-Z0-9]+$/).max(20),
  labels: z.object(
    Object.fromEntries(LOCALES.map((locale) => [locale, z.string().trim().min(1).max(ANIMAL_LIMITS.label)])) as Record<
      Locale,
      z.ZodString
    >,
  ),
});

export const animalListSchema = z
  .array(animalOptionSchema)
  .min(1)
  .max(ANIMAL_LIMITS.items)
  .refine((list) => new Set(list.map((animal) => animal.value)).size === list.length, "Twee dieren met dezelfde naam")
  .refine((list) => new Set(list.map((animal) => animal.code)).size === list.length, "Twee dieren met dezelfde code");

export type AnimalOption = z.infer<typeof animalOptionSchema>;
