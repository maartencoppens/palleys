import { ORDER_NUMBER_DIGITS, ORDER_NUMBER_PREFIX } from "@/data/checkout";

/** 2026, 42 → "PAL-2026-00042". Sorts correctly as text within a year. */
export function formatOrderNumber(year: number, sequence: number) {
  if (!Number.isInteger(sequence) || sequence < 1) throw new Error(`Invalid order sequence ${sequence}`);
  return `${ORDER_NUMBER_PREFIX}-${year}-${String(sequence).padStart(ORDER_NUMBER_DIGITS, "0")}`;
}

/** The year an order number counts in: Brussels time, so an order at 00:30 on 1 January belongs to the new year. */
export function orderYear(date: Date = new Date()) {
  return Number(new Intl.DateTimeFormat("en-CA", { year: "numeric", timeZone: "Europe/Brussels" }).format(date));
}

/** Hides most of an e-mail address for logs: "jan.peeters@gmail.com" → "ja***@gmail.com". */
export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 2)}***@${domain}`;
}
