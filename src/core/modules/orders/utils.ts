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
 * (an order number or product code from before the standard). A reprint order (after a warranty claim) keeps the name of
 * the order the Palley was first made for, with -R<n>: PAL-PLY1042-01-P-RING-KAT-R1.
 */
export type PalleyNameSource = {
  position: number;
  productCode: string;
  reprintNr: number;
  order: { number: string; reprintOf: { number: string } | null };
};

export function palleyNameOf(item: PalleyNameSource) {
  const orderNumber = item.order.reprintOf?.number ?? item.order.number;
  if (parseOrderRef(orderNumber) === null) return null;
  try {
    return palleyName({ orderRef: orderNumber, index: item.position, productCode: item.productCode, reprintNr: item.reprintNr });
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
