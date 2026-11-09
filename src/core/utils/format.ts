import { DEFAULT_LOCALE, INTL_LOCALES, type Locale } from "@/core/locale/config";

const dateTimeFormatter = new Intl.DateTimeFormat("nl-BE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Brussels",
});

export function formatDateTime(iso: string) {
  return dateTimeFormatter.format(new Date(iso));
}

// "en-CA" geeft YYYY-MM-DD; zonder streepjes sorteert het mooi als bestandsnaam.
const compactDateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Europe/Brussels",
});

export function formatDateCompact(date: Date) {
  return compactDateFormatter.format(date).replaceAll("-", "");
}

const DAY_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" };
const MOMENT_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Brussels" };

/** A calendar day ("2026-11-23") in a language: "23 november 2026" / "23 November 2026". */
export const formatDay = (day: string, locale: Locale = DEFAULT_LOCALE) =>
  new Intl.DateTimeFormat(INTL_LOCALES[locale], DAY_FORMAT).format(new Date(`${day}T00:00:00Z`));

/** A moment in Belgian time, in a language: "9 november 2026 om 15:42". */
export const formatMoment = (iso: string, locale: Locale = DEFAULT_LOCALE) =>
  new Intl.DateTimeFormat(INTL_LOCALES[locale], MOMENT_FORMAT).format(new Date(iso));

/** A length in metres as centimetres in a language: 0.037 → "3,7 cm" / "3.7 cm". */
export const formatCentimeters = (meters: number, locale: Locale = DEFAULT_LOCALE) =>
  `${(meters * 100).toLocaleString(INTL_LOCALES[locale], { maximumFractionDigits: 1 })} cm`;

/** Formats a euro amount in a language: 25.95 → "€ 25,95" or "€ 25.95". */
export const formatPrice = (price: number, locale: Locale = DEFAULT_LOCALE) =>
  `€ ${price.toLocaleString(INTL_LOCALES[locale], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Cents as the text of a price field: 2799 → "27,99". */
export const toEuroInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

/** Reads a price field back: "27,99" or "27.99" → 2799. Null when it isn't a valid amount. */
export const fromEuroInput = (value: string) => {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
};

/** Formats a file size, e.g. 2_516_582 → "2,4 MB" and 48_000 → "47 KB". */
export const formatFileSize = (bytes: number, locale: Locale = DEFAULT_LOCALE) => {
  const megabytes = bytes / 1024 / 1024;
  if (megabytes < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${megabytes.toLocaleString(INTL_LOCALES[locale], { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
};
