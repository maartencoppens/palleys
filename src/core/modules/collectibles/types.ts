import { z } from "zod";
import { COLLECTIBLE_LIMITS } from "@/data/collectibles";
import { MAX_PRODUCT_PRICE_CENTS } from "@/data/pricing";
import { isCollectibleImageKey } from "./utils";
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
  sku: string;
  translations: CollectibleTranslations;
  /** Texts still missing in another language, as "en.name". */
  missingTranslations: string[];
  imageKey: string | null;
  published: boolean;
  sortOrder: number;
  archivedAt: string | null;
  orderedQuantity: number;
};
