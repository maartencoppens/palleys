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

/** Formats a euro amount the Belgian way, e.g. 25.95 → "€ 25,95". */
export const formatPrice = (price: number) =>
  `€ ${price.toLocaleString("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Formats a file size, e.g. 2_516_582 → "2,4 MB" and 48_000 → "47 KB". */
export const formatFileSize = (bytes: number) => {
  const megabytes = bytes / 1024 / 1024;
  if (megabytes < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${megabytes.toLocaleString("nl-BE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
};
