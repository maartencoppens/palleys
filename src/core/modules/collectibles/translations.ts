import { z } from "zod";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/core/locale/config";
import { COLLECTIBLE_LIMITS } from "@/data/collectibles";

/*
 * A collectible's texts in the other languages. The main fields (name, description, tag) are the default language;
 * every other language lives in one JSON column, so adding a language needs no migration. No server-only imports.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

/** The languages a collectible needs a translation for: every one but the default, whose texts are the main fields. */
export const TRANSLATED_LOCALES: Locale[] = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);
export type TranslatedLocale = Locale;

export const collectibleTranslationSchema = z.object({
  name: optionalText(COLLECTIBLE_LIMITS.name),
  description: optionalText(COLLECTIBLE_LIMITS.description),
  tag: optionalText(COLLECTIBLE_LIMITS.tag),
});

export const collectibleTranslationsSchema = z.partialRecord(
  z.enum(TRANSLATED_LOCALES as [Locale, ...Locale[]]),
  collectibleTranslationSchema,
);

export type CollectibleTranslation = z.infer<typeof collectibleTranslationSchema>;
export type CollectibleTranslations = z.infer<typeof collectibleTranslationsSchema>;

const TRANSLATED_FIELDS = ["name", "description", "tag"] as const;

/** The texts filled in in the default language but still missing in another one, as "en.name". */
export function missingTranslations(input: {
  name: string;
  description: string | null;
  tag: string | null;
  translations: CollectibleTranslations;
}) {
  return TRANSLATED_LOCALES.flatMap((locale) =>
    TRANSLATED_FIELDS.filter((field) => input[field] && !input.translations[locale]?.[field]).map((field) => `${locale}.${field}`),
  );
}

/** What the database holds, or nothing when it isn't what we expect. */
export function parseTranslations(value: unknown): CollectibleTranslations {
  return collectibleTranslationsSchema.safeParse(value).data ?? {};
}

/** Name, description and label in this language. A text that isn't translated yet stays in the default language. */
export function localizedTexts(
  row: { name: string; description: string | null; tag: string | null; translations: unknown },
  locale: Locale,
) {
  const translation = locale === DEFAULT_LOCALE ? undefined : parseTranslations(row.translations)[locale];
  return {
    name: translation?.name || row.name,
    description: translation?.description || row.description,
    tag: translation?.tag || row.tag,
  };
}
