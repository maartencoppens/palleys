import { NamingError, palleyName, parseOrderRef } from "@/core/utils/naming";

// Keys in the Counter table: one running order counter, an invoice counter per year.
export const ORDER_COUNTER_KEY = "order";
export const invoiceCounterKey = (year: number) => `invoice-${year}`;

/** The year an invoice number counts in: Brussels time, so an order at 00:30 on 1 January belongs to the new year. */
export function orderYear(date: Date = new Date()) {
  return Number(new Intl.DateTimeFormat("en-CA", { year: "numeric", timeZone: "Europe/Brussels" }).format(date));
}

/**
 * The name of the Palley an order line makes: PAL-PLY1042-01-P-RING-KAT. Null for a line that can't be named that way
 * (an order number or product code from before the standard).
 */
export function palleyNameOf(item: { position: number; productCode: string; reprintNr: number; order: { number: string } }) {
  if (parseOrderRef(item.order.number) === null) return null;
  try {
    return palleyName({ orderRef: item.order.number, index: item.position, productCode: item.productCode, reprintNr: item.reprintNr });
  } catch (error) {
    if (error instanceof NamingError) return null;
    throw error;
  }
}

/** Hides most of an e-mail address for logs: "jan.peeters@gmail.com" → "ja***@gmail.com". */
export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 2)}***@${domain}`;
}
