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
