import { z } from "zod";
import { COLLECTIBLE_LIMITS } from "@/data/collectibles";
import { MAX_PRODUCT_PRICE_CENTS } from "@/data/pricing";
import { MAX_PRINT_FILE_BYTES } from "@/data/uploads";
import { animalOptionSchema } from "@/core/modules/animals/types";
import { MAX_ANIMAL_PROMPT_LENGTH, MAX_PROMPT_LENGTH } from "@/data/prompts";
import { isCollectibleImageKey, isCollectibleModelKey } from "./utils";
import { collectibleTranslationsSchema, missingTranslations, type CollectibleTranslations } from "./translations";

export { TRANSLATED_LOCALES, missingTranslations, type CollectibleTranslation, type CollectibleTranslations, type TranslatedLocale } from "./translations";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

export const collectibleInputSchema = z
  .object({
    name: z.string().trim().min(1).max(COLLECTIBLE_LIMITS.name),
    description: optionalText(COLLECTIBLE_LIMITS.description),
    tag: optionalText(COLLECTIBLE_LIMITS.tag),
    priceCents: z.number().int().min(100).max(MAX_PRODUCT_PRICE_CENTS),
    imageKey: z.string().refine(isCollectibleImageKey).nullable(),
    modelKey: z.string().refine(isCollectibleModelKey).nullable().default(null),
    modelFileName: z.string().trim().max(200).nullable().default(null),
    animalCode: animalOptionSchema.shape.code.nullable().default(null),
    published: z.boolean(),
    soldOut: z.boolean(),
    sortOrder: z.number().int().min(0).max(9999),
    translations: collectibleTranslationsSchema.default({}),
  })
  .refine((value) => !value.published || missingTranslations(value).length === 0, {
    path: ["translations"],
    message: "Vul ook de Engelse teksten in voor je dit product op de website zet",
  })
  .refine((value) => !value.published || value.imageKey !== null, {
    path: ["imageKey"],
    message: "Voeg een foto toe voor je dit product op de website zet",
  })
  .refine((value) => !value.published || value.animalCode !== null, {
    path: ["animalCode"],
    message: "Kies het dier voor je dit product op de website zet",
  });

export type CollectibleInput = z.infer<typeof collectibleInputSchema>;

/** What a visitor sees. */
export type CollectibleView = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tag: string | null;
  priceCents: number;
  imageUrl: string | null;
  soldOut: boolean;
};

export type AdminCollectible = CollectibleView & {
  number: number;
  animalCode: string | null;
  /** COL-007-HOND, null while no animal is chosen. */
  collectibleId: string | null;
  modelKey: string | null;
  modelFileName: string | null;
  /** The backoffice order whose preview made this model, if any. */
  sourcePreviewId: string | null;
  translations: CollectibleTranslations;
  /** Texts still missing in another language, as "en.name". */
  missingTranslations: string[];
  imageKey: string | null;
  published: boolean;
  sortOrder: number;
  archivedAt: string | null;
  orderedQuantity: number;
};

export const modelUploadSchema = z.object({ size: z.number().int().positive().max(MAX_PRINT_FILE_BYTES) });

/**
 * A new collectible's model: the animal whose prompt it started from (null = the general prompt, e.g. a lion), and the
 * prompt as the admin left it.
 */
export const generateCollectibleSchema = z.object({
  animalType: animalOptionSchema.shape.code.nullable(),
  prompt: z.string().trim().min(1).max(MAX_PROMPT_LENGTH + MAX_ANIMAL_PROMPT_LENGTH),
});

export type GenerateCollectibleInput = z.infer<typeof generateCollectibleSchema>;
