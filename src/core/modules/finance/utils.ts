import { addDays, brusselsDay, type CalendarDay } from "@/core/modules/returns/utils";
import { MANUAL_PAYMENT_PROVIDER, PAYMENT_METHOD_LABELS } from "@/data/payment-methods";
import { MAX_RANGE_DAYS, type FinanceOrder, type FinancePayment, type PaymentMode } from "./types";

/*
 * Money rules shared by the sales journal and the finance overview. Pure: no database, so the unit tests cover them.
 * Days are calendar days in Belgium, like everywhere in the shop.
 */

// ---------- Dates ----------

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Brussels",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** How far Brussels is ahead of UTC at this moment, in ms (1 or 2 hours). */
function brusselsOffset(ms: number) {
  const parts = Object.fromEntries(partsFormatter.formatToParts(new Date(ms)).map((part) => [part.type, Number(part.value)]));
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - (ms - (ms % 1000));
}

/** Midnight at the start of a Belgian calendar day, as a moment: 2026-11-01 → 2026-10-31T23:00:00Z. */
export function brusselsMidnight(day: CalendarDay) {
  const utc = Date.parse(`${day}T00:00:00Z`);
  const first = utc - brusselsOffset(utc);
  return new Date(utc - brusselsOffset(first));
}

export class InvalidRangeError extends Error {}

/** The period a request asks for, both days included. Empty = from the first of this month up to today. */
export function resolveRange(input: { from?: string; to?: string }, now: Date = new Date()) {
  const today = brusselsDay(now);
  const to = input.to ?? today;
  const from = input.from ?? `${to.slice(0, 7)}-01`;
  if (from > to) throw new InvalidRangeError("De begindatum ligt na de einddatum");
  if (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`) > MAX_RANGE_DAYS * 86_400_000) {
    throw new InvalidRangeError(`Kies een periode van hoogstens ${MAX_RANGE_DAYS} dagen`);
  }
  return { from, to, start: brusselsMidnight(from), end: brusselsMidnight(addDays(to, 1)) };
}

const journalDateFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Brussels", day: "2-digit", month: "2-digit", year: "numeric" });

/** dd/mm/jjjj in Belgian time, as Excel (nl-BE) reads a date. */
export const formatJournalDate = (date: Date) => journalDateFormatter.format(date);

/** Cents as Excel (nl-BE) reads an amount: 123450 → "1234,50", -995 → "-9,95". No thousands separator. */
export const formatJournalAmount = (cents: number) => `${cents < 0 ? "-" : ""}${(Math.abs(cents) / 100).toFixed(2).replace(".", ",")}`;

// ---------- Payments ----------

/** Methods for which no money came in: the order was given away, or a discount made it free. */
export const NO_MONEY_METHODS = ["gift", "discount", "stock"] as const;

export const isManualPayment = (payment: Pick<FinancePayment, "provider">) => payment.provider === MANUAL_PAYMENT_PROVIDER;

/** The payment that settled the order: its latest PAID one. */
export function settledPayment(order: Pick<FinanceOrder, "payments">) {
  return order.payments.filter((payment) => payment.status === "PAID").sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
}

/** The payment the order is about: the settled one, else the newest (an open payment link). */
function mainPayment(order: Pick<FinanceOrder, "payments">) {
  return settledPayment(order) ?? [...order.payments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
}

/** Test or live. A payment recorded by hand has no Stripe mode: that is real money, so live. */
export const paymentMode = (payment: Pick<FinancePayment, "mode"> | null): PaymentMode => (payment?.mode === "test" ? "test" : "live");

export const orderMode = (order: Pick<FinanceOrder, "payments">) => paymentMode(mainPayment(order));

/** The key the overview groups by: Stripe's method (bancontact, ideal, wero, ...) or the manual one (cash, gift, ...). */
export function methodKey(payment: Pick<FinancePayment, "method"> | null) {
  return payment?.method || "unknown";
}

export const methodLabel = (key: string) => PAYMENT_METHOD_LABELS[key] ?? (key === "unknown" ? "Onbekend" : key);

/** Did real money come in with this payment? Not for a gift, a free order or a stock order. */
export const isMoneyPayment = (payment: Pick<FinancePayment, "method" | "amountCents">) =>
  payment.amountCents > 0 && !(NO_MONEY_METHODS as readonly string[]).includes(payment.method ?? "");

/** What really came in for this order: the settled payment's amount, or 0. */
export function receivedCents(order: Pick<FinanceOrder, "payments">) {
  const payment = settledPayment(order);
  return payment && isMoneyPayment(payment) ? payment.amountCents : 0;
}

/**
 * The reference that finds the money back: for Stripe the PaymentIntent (pi_…, what Stripe's dashboard and payouts
 * show), else the Checkout Session; for a payment recorded by hand the order number (what a transfer mentions).
 */
export function paymentReference(order: Pick<FinanceOrder, "number">, payment: Pick<FinancePayment, "provider" | "paymentIntentId" | "providerPaymentId"> | null) {
  if (!payment || isManualPayment(payment)) return order.number;
  return payment.paymentIntentId ?? payment.providerPaymentId;
}

/** Sent by post (home or service point), not picked up or handed over. */
export const isShipped = (order: Pick<FinanceOrder, "deliveryType">) => order.deliveryType === "HOME" || order.deliveryType === "SERVICE_POINT";

export const customerName = (order: Pick<FinanceOrder, "firstName" | "lastName">) => `${order.firstName} ${order.lastName}`.trim();
