import { addDays, brusselsDay, type CalendarDay } from "@/core/modules/returns/utils";
import type { FinanceAdjustment, FinanceBreakdownRow, FinanceOrder, FinanceOrderRow, FinanceSummary, Granularity } from "./types";
import { customerName, isManualPayment, methodKey, methodLabel, receivedCents, settledPayment } from "./utils";

/*
 * The figures on the finance page. Pure: the service reads the orders paid in the period (stock orders left out) and the
 * refunds seen in it, already filtered on test/live, method and status; this adds them up.
 *
 * Revenue is money that really came in (Stripe, cash, a transfer), on the payment day. Gifts and orders a discount made
 * free count as orders but not as revenue. Refunds and chargebacks are on the day we saw them, so the net of a period
 * can include a refund of an order paid earlier: that matches the bank, and the sales journal does the same.
 */

/** Day for up to a month, week for up to half a year, month beyond: a readable number of bars. */
export function granularityFor(from: CalendarDay, to: CalendarDay): Granularity {
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
  if (days <= 31) return "day";
  if (days <= 26 * 7) return "week";
  return "month";
}

/** The first day of the bucket a day falls in: itself, its Monday, or the first of its month. */
export function bucketStart(day: CalendarDay, granularity: Granularity): CalendarDay {
  if (granularity === "day") return day;
  if (granularity === "month") return `${day.slice(0, 7)}-01`;
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = zondag
  return addDays(day, -((weekday + 6) % 7));
}

function nextBucket(start: CalendarDay, granularity: Granularity): CalendarDay {
  if (granularity === "day") return addDays(start, 1);
  if (granularity === "week") return addDays(start, 7);
  const [year, month] = start.split("-").map(Number);
  return month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function bucketLabel(start: CalendarDay, granularity: Granularity) {
  const [year, month, day] = start.split("-").map(Number);
  if (granularity === "month") return `${MONTHS[month - 1]} ${year}`;
  return `${granularity === "week" ? "wk " : ""}${day} ${MONTHS[month - 1]}`;
}

function breakdown(entries: Map<string, { label: string; count: number; cents: number }>, total: number): FinanceBreakdownRow[] {
  return [...entries.entries()]
    .map(([key, value]) => ({ key, ...value, share: total > 0 ? value.cents / total : 0 }))
    .sort((a, b) => b.cents - a.cents || b.count - a.count);
}

function add(map: Map<string, { label: string; count: number; cents: number }>, key: string, label: string, cents: number, count = 1) {
  const entry = map.get(key) ?? { label, count: 0, cents: 0 };
  entry.count += count;
  entry.cents += cents;
  map.set(key, entry);
}

export function summarize(orders: FinanceOrder[], adjustments: FinanceAdjustment[], range: { from: CalendarDay; to: CalendarDay }): FinanceSummary {
  const paid = orders.filter((order) => order.paidAt !== null && !order.stockOrder);
  const granularity = granularityFor(range.from, range.to);

  const byMethod = new Map<string, { label: string; count: number; cents: number }>();
  const byChannel = new Map<string, { label: string; count: number; cents: number }>();
  const byProduct = new Map<string, { label: string; count: number; cents: number }>();
  const buckets = new Map<CalendarDay, { cents: number; count: number }>();
  for (let start = bucketStart(range.from, granularity); start <= range.to; start = nextBucket(start, granularity)) {
    buckets.set(start, { cents: 0, count: 0 });
  }

  let grossCents = 0;
  let moneyOrders = 0;
  let productCents = 0;
  let shippingCents = 0;
  let discountCents = 0;
  let discountOrders = 0;
  for (const order of paid) {
    const cents = receivedCents(order);
    const payment = settledPayment(order);
    const key = methodKey(payment);
    add(byMethod, key, methodLabel(key), cents);
    add(byChannel, order.createdBy ? "manual" : "website", order.createdBy ? "Handmatig toegevoegd" : "Website", cents);
    discountCents += order.discountCents;
    if (order.discountCents > 0) discountOrders++;

    const bucket = buckets.get(bucketStart(brusselsDay(order.paidAt!), granularity));
    if (bucket) {
      bucket.cents += cents;
      bucket.count++;
    }
    if (cents <= 0) continue;
    grossCents += cents;
    moneyOrders++;
    shippingCents += order.shippingCents;
    productCents += order.subtotalCents - order.discountCents;
    for (const item of order.items) {
      // Before the order discount: what each kind of product was sold for.
      add(byProduct, item.kind, item.kind === "personalized" ? "Palley op maat" : "Collectibles", item.unitCents * item.quantity, item.quantity);
    }
  }

  const sumOf = (kind: FinanceAdjustment["kind"]) =>
    adjustments.filter((adjustment) => adjustment.kind === kind && !adjustment.order.stockOrder).reduce((sum, adjustment) => sum + adjustment.amountCents, 0);
  const refundedCents = sumOf("REFUND");
  const chargebackCents = sumOf("CHARGEBACK");
  const productTotal = [...byProduct.values()].reduce((sum, entry) => sum + entry.cents, 0);

  return {
    grossCents,
    refundedCents,
    chargebackCents,
    netCents: grossCents - refundedCents - chargebackCents,
    paidOrders: paid.length,
    moneyOrders,
    freeOrders: paid.length - moneyOrders,
    averageOrderCents: moneyOrders > 0 ? Math.round(grossCents / moneyOrders) : 0,
    productCents,
    shippingCents,
    discountCents,
    discountOrders,
    byMethod: breakdown(byMethod, grossCents),
    byChannel: breakdown(byChannel, grossCents),
    byProduct: breakdown(byProduct, productTotal),
    granularity,
    series: [...buckets.entries()].map(([start, value]) => ({ start, label: bucketLabel(start, granularity), ...value })),
  };
}

export function orderRow(order: FinanceOrder): FinanceOrderRow {
  const payment = settledPayment(order) ?? order.payments[0] ?? null;
  return {
    id: order.id,
    number: order.number,
    invoiceNumber: order.invoiceNumber,
    status: order.status,
    name: customerName(order),
    paidAt: order.paidAt?.toISOString() ?? null,
    method: methodLabel(methodKey(payment)),
    manual: payment ? isManualPayment(payment) : Boolean(order.createdBy),
    totalCents: order.totalCents,
    receivedCents: receivedCents(order),
    refundedCents: order.payments.reduce((sum, p) => sum + p.refundedCents, 0),
    chargedBackCents: order.payments.reduce((sum, p) => sum + p.chargedBackCents, 0),
  };
}
