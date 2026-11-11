import "server-only";
import { prisma } from "@/db/client";
import type { Prisma } from "@/db/generated/client";
import { customersTable, ledgerTable, receiptsTable } from "./journal";
import { orderRow, summarize } from "./overview";
import type {
  FinanceAdjustment,
  FinanceOrder,
  FinanceOverview,
  FinancePayment,
  FinanceQuery,
  JournalQuery,
  PaymentMode,
  SalesJournal,
} from "./types";
import { methodKey, methodLabel, orderMode, paymentMode, resolveRange, settledPayment } from "./utils";

/*
 * Reads what the sales journal and the finance overview need. The rules are in journal.ts, overview.ts and utils.ts
 * (pure, unit tested); this only fetches and filters. Read-only: nothing here changes an order or a payment.
 */

/** Orders in the finance views list at most this many rows; the totals always cover the whole period. */
const ORDER_LIST_LIMIT = 300;

const PAYMENT_SELECT = {
  provider: true,
  providerPaymentId: true,
  mode: true,
  method: true,
  status: true,
  amountCents: true,
  refundedCents: true,
  chargedBackCents: true,
  rawLastStatus: true,
  createdAt: true,
} as const satisfies Prisma.PaymentSelect;

const ORDER_SELECT = {
  id: true,
  number: true,
  invoiceNumber: true,
  status: true,
  createdBy: true,
  stockOrder: true,
  attentionReason: true,
  createdAt: true,
  paidAt: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  street: true,
  houseNumber: true,
  postalCode: true,
  city: true,
  country: true,
  subtotalCents: true,
  shippingCents: true,
  discountCents: true,
  discountCode: true,
  totalCents: true,
  shipment: { select: { deliveryType: true } },
  items: { select: { previewId: true, quantity: true, unitCents: true } },
  payments: { select: PAYMENT_SELECT },
} as const satisfies Prisma.OrderSelect;

type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof PAYMENT_SELECT }>;
type OrderRow = Prisma.OrderGetPayload<{ select: typeof ORDER_SELECT }>;

/** The PaymentIntent from the safe snapshot of the Checkout Session (Payment.rawLastStatus). */
function paymentIntentOf(raw: Prisma.JsonValue) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const id = (raw as Record<string, unknown>).paymentIntentId;
  return typeof id === "string" && id.startsWith("pi_") ? id : null;
}

function toPayment({ rawLastStatus, ...payment }: PaymentRow): FinancePayment {
  return { ...payment, paymentIntentId: paymentIntentOf(rawLastStatus) };
}

function toOrder({ shipment, items, payments, ...order }: OrderRow): FinanceOrder {
  return {
    ...order,
    deliveryType: shipment?.deliveryType ?? null,
    items: items.map((item) => ({ kind: item.previewId ? "personalized" : "collectible", quantity: item.quantity, unitCents: item.unitCents })),
    payments: payments.map(toPayment),
  };
}

/** Orders paid in the period (stock orders never: nothing was sold), test or live. */
async function paidOrders(range: { start: Date; end: Date }, mode: PaymentMode) {
  const rows = await prisma.order.findMany({
    where: { paidAt: { gte: range.start, lt: range.end }, stockOrder: false },
    orderBy: { paidAt: "asc" },
    select: ORDER_SELECT,
  });
  return rows.map(toOrder).filter((order) => orderMode(order) === mode);
}

/** Refunds and chargebacks seen in the period, test or live. */
async function adjustments(range: { start: Date; end: Date }, mode: PaymentMode): Promise<(FinanceAdjustment & { orderStatus: string })[]> {
  const rows = await prisma.paymentAdjustment.findMany({
    where: { occurredAt: { gte: range.start, lt: range.end } },
    orderBy: { occurredAt: "asc" },
    select: {
      id: true,
      kind: true,
      amountCents: true,
      occurredAt: true,
      payment: {
        select: {
          provider: true,
          providerPaymentId: true,
          mode: true,
          method: true,
          rawLastStatus: true,
          order: { select: { id: true, number: true, invoiceNumber: true, stockOrder: true, firstName: true, lastName: true, status: true } },
        },
      },
    },
  });
  return rows
    .filter((row) => paymentMode(row.payment) === mode)
    .map(({ payment: { order: { status, ...order }, rawLastStatus, ...payment }, ...row }) => ({
      ...row,
      order,
      orderStatus: status,
      payment: { ...payment, paymentIntentId: paymentIntentOf(rawLastStatus) },
    }));
}

export async function getSalesJournal(query: JournalQuery, now: Date = new Date()): Promise<SalesJournal> {
  const range = resolveRange(query, now);
  const [orders, refunds] = await Promise.all([paidOrders(range, query.mode), adjustments(range, query.mode)]);
  return {
    from: range.from,
    to: range.to,
    mode: query.mode,
    receipts: receiptsTable(orders),
    customers: customersTable(orders),
    ledger: ledgerTable(orders, refunds),
  };
}

export async function getFinanceOverview(query: FinanceQuery, now: Date = new Date()): Promise<FinanceOverview> {
  const range = resolveRange(query, now);
  const [allOrders, allAdjustments, open] = await Promise.all([
    paidOrders(range, query.mode),
    adjustments(range, query.mode),
    prisma.order.findMany({
      where: { stockOrder: false, OR: [{ status: "PENDING_PAYMENT" }, { attentionReason: { not: null } }] },
      select: { status: true, totalCents: true, attentionReason: true, payments: { select: PAYMENT_SELECT } },
    }),
  ]);

  const methods = new Map<string, string>();
  for (const order of allOrders) {
    const key = methodKey(settledPayment(order));
    methods.set(key, methodLabel(key));
  }

  const orders = allOrders.filter(
    (order) => (!query.method || methodKey(settledPayment(order)) === query.method) && (!query.status || order.status === query.status),
  );
  const refunds = allAdjustments.filter(
    (adjustment) => (!query.method || methodKey(adjustment.payment) === query.method) && (!query.status || adjustment.orderStatus === query.status),
  );

  // Open right now, whatever the period: what's still to be paid, and what needs looking at.
  const openInMode = open.filter((order) => orderMode({ payments: order.payments.map(toPayment) }) === query.mode);
  const pending = openInMode.filter((order) => order.status === "PENDING_PAYMENT");

  const listed = [...orders].sort((a, b) => b.paidAt!.getTime() - a.paidAt!.getTime());
  return {
    query: { from: range.from, to: range.to, mode: query.mode, method: query.method, status: query.status },
    summary: summarize(orders, refunds, range),
    open: {
      pendingOrders: pending.length,
      pendingCents: pending.reduce((sum, order) => sum + order.totalCents, 0),
      attentionOrders: openInMode.filter((order) => order.attentionReason).length,
    },
    methods: [...methods.entries()].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label, "nl")),
    orders: listed.slice(0, ORDER_LIST_LIMIT).map(orderRow),
    ordersTruncated: listed.length > ORDER_LIST_LIMIT,
  };
}
