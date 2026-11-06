/*
 * The languages of the shop. Adding one: a new file in ./messages (TypeScript and messages.test.ts make sure nothing is
 * missing), one line here and one in ./messages/index.ts, and its texts in /admin/settings/content.
 * The default language has no prefix in its URLs (/create), every other one does (/en/create). No server-only imports.
 */
export const LOCALES = ["nl", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "nl";

// Shown in the language switcher, always in the language itself.
export const LOCALE_LABELS: Record<Locale, { short: string; name: string }> = {
  nl: { short: "NL", name: "Nederlands" },
  en: { short: "EN", name: "English" },
};

// How numbers look per language: € 27,99 and € 27.99.
export const INTL_LOCALES: Record<Locale, string> = { nl: "nl-BE", en: "en-GB" };

export const hasLocale = (value: string | null | undefined): value is Locale =>
  LOCALES.includes(value as Locale);

/** An order or a request can carry anything: what it doesn't know becomes the default language. */
export const toLocale = (value: string | null | undefined): Locale => (hasLocale(value) ? value : DEFAULT_LOCALE);

/** Takes the language off a path: /en/create and /nl/create → /create, /en → /. */
export function stripLocale(pathname: string) {
  const [, first, ...rest] = pathname.split("/");
  return hasLocale(first) ? `/${rest.join("/")}` : pathname;
}

/** A path inside the site in this language: /create → /en/create, /#faq → /en#faq. Other links stay as they are. */
export function localizedPath(href: string, locale: Locale) {
  if (locale === DEFAULT_LOCALE || !href.startsWith("/") || href.startsWith("//")) return href;
  const rest = href.slice(1);
  if (!rest || rest.startsWith("#") || rest.startsWith("?")) return `/${locale}${rest}`;
  return `/${locale}/${rest}`;
}
