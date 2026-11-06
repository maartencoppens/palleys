import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { getSiteSettings } from "@/core/modules/settings/service";
import { DEFAULT_LOCALE, hasLocale, LOCALES, localizedPath, type Locale } from "./config";
import { MESSAGES } from "./messages";

/* The language of the current page, for Server Components. Client Components use ./client instead. */
export async function getLocale(): Promise<Locale> {
  const locale = await lang();
  if (!hasLocale(locale)) notFound();
  return locale;
}

export async function getMessages() {
  return MESSAGES[await getLocale()];
}

/** The texts an admin manages, in the language of the page. */
export async function getSiteContent() {
  const [{ content }, locale] = await Promise.all([getSiteSettings(), getLocale()]);
  return content[locale];
}

/** Tells search engines where a page lives per language. */
export function localeAlternates(locale: Locale, path: string): Metadata["alternates"] {
  return {
    canonical: localizedPath(path, locale),
    languages: {
      ...Object.fromEntries(LOCALES.map((item) => [item, localizedPath(path, item)])),
      "x-default": localizedPath(path, DEFAULT_LOCALE),
    },
  };
}

/** For generateMetadata, which gets the language as a parameter. */
export async function metadataLocale(params: Promise<{ lang: string }>) {
  const { lang: value } = await params;
  const locale = hasLocale(value) ? value : DEFAULT_LOCALE;
  return { locale, messages: MESSAGES[locale] };
}
