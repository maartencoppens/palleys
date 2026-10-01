const dateTimeFormatter = new Intl.DateTimeFormat("nl-BE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Brussels",
});

export function formatDateTime(iso: string) {
  return dateTimeFormatter.format(new Date(iso));
}
