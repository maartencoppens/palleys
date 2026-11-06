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
