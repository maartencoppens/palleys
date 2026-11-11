import { describe, expect, it } from "vitest";
import { bucketStart, granularityFor, summarize } from "./overview";
import type { FinanceAdjustment, FinanceOrder, FinancePayment } from "./types";

const payment = (overrides: Partial<FinancePayment> = {}): FinancePayment => ({
  provider: "stripe",
  providerPaymentId: "cs_live_abc",
  mode: "live",
  method: "bancontact",
  status: "PAID",
  amountCents: 3490,
  refundedCents: 0,
  chargedBackCents: 0,
  paymentIntentId: "pi_1",
  createdAt: new Date("2026-11-03T09:00:00Z"),
  ...overrides,
});

let n = 0;
const order = (overrides: Partial<FinanceOrder> = {}): FinanceOrder => ({
  id: `o${++n}`,
  number: `PLY${1000 + n}`,
  invoiceNumber: null,
  status: "PAID",
  createdBy: null,
  stockOrder: false,
  attentionReason: null,
  createdAt: new Date("2026-11-03T09:00:00Z"),
  paidAt: new Date("2026-11-03T09:05:00Z"),
  firstName: "An",
  lastName: "Peeters",
  email: null,
  phone: null,
  street: null,
  houseNumber: null,
  postalCode: null,
  city: null,
  country: "BE",
  subtotalCents: 2995,
  shippingCents: 495,
  discountCents: 0,
  discountCode: null,
  totalCents: 3490,
  deliveryType: "HOME",
  items: [{ kind: "personalized", quantity: 1, unitCents: 2995 }],
  payments: [payment()],
  ...overrides,
});

describe("granularity", () => {
  it("is per day up to a month, per week up to half a year, per month beyond", () => {
    expect(granularityFor("2026-11-01", "2026-11-30")).toBe("day");
    expect(granularityFor("2026-09-01", "2026-11-30")).toBe("week");
    expect(granularityFor("2026-01-01", "2026-12-31")).toBe("month");
  });

  it("starts a week on Monday", () => {
    expect(bucketStart("2026-11-11", "week")).toBe("2026-11-09"); // a Wednesday
    expect(bucketStart("2026-11-15", "week")).toBe("2026-11-09"); // a Sunday
    expect(bucketStart("2026-11-11", "month")).toBe("2026-11-01");
  });
});

describe("summary", () => {
  const range = { from: "2026-11-01", to: "2026-11-30" };

  it("counts only money that came in as revenue, and nets refunds and chargebacks", () => {
    const ideal = order({ payments: [payment({ method: "ideal", amountCents: 2000 })], totalCents: 2000, subtotalCents: 2500, discountCents: 500, shippingCents: 0, discountCode: "VRIEND" });
    const cash = order({ createdBy: "Maarten", payments: [payment({ provider: "manual", method: "cash", mode: null })] });
    const gift = order({ createdBy: "Maarten", payments: [payment({ provider: "manual", method: "gift" })] });
    const stock = order({ stockOrder: true, payments: [payment({ provider: "manual", method: "stock", amountCents: 0 })] });
    const refund: FinanceAdjustment = {
      id: "a1",
      kind: "REFUND",
      amountCents: 1000,
      occurredAt: new Date("2026-11-04T08:00:00Z"),
      order: { id: "x", number: "PLY1", invoiceNumber: null, stockOrder: false, firstName: "A", lastName: "B" },
      payment: { provider: "stripe", providerPaymentId: "cs", mode: "live", method: "bancontact", paymentIntentId: null },
    };
    const summary = summarize([order(), ideal, cash, gift, stock], [refund, { ...refund, id: "a2", kind: "CHARGEBACK", amountCents: 500 }], range);

    expect(summary).toMatchObject({
      grossCents: 3490 + 2000 + 3490,
      refundedCents: 1000,
      chargebackCents: 500,
      netCents: 3490 + 2000 + 3490 - 1500,
      paidOrders: 4, // the stock order isn't a sale
      moneyOrders: 3,
      freeOrders: 1,
      averageOrderCents: Math.round((3490 + 2000 + 3490) / 3),
      shippingCents: 495 + 0 + 495,
      productCents: 2995 + 2000 + 2995,
      discountCents: 500,
      discountOrders: 1,
    });
    expect(summary.byMethod.map((row) => [row.key, row.count, row.cents])).toEqual([
      ["bancontact", 1, 3490],
      ["cash", 1, 3490],
      ["ideal", 1, 2000],
      ["gift", 1, 0],
    ]);
    expect(summary.byChannel.find((row) => row.key === "manual")).toMatchObject({ count: 2, cents: 3490 });
  });

  it("has a bar for every day of the period, also the empty ones, on the Belgian payment day", () => {
    const late = order({ paidAt: new Date("2026-11-04T23:30:00Z") }); // 5 November in Brussels
    const summary = summarize([order(), late], [], range);
    expect(summary.series).toHaveLength(30);
    expect(summary.series.find((bucket) => bucket.start === "2026-11-05")).toMatchObject({ cents: 3490, count: 1, label: "5 nov" });
    expect(summary.series.find((bucket) => bucket.start === "2026-11-04")).toMatchObject({ cents: 0, count: 0 });
  });
});
