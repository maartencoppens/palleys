import { describe, expect, it } from "vitest";
import { customersTable, ledgerTable, receiptsTable, textCell, toTsv } from "./journal";
import type { FinanceAdjustment, FinanceOrder, FinancePayment } from "./types";
import { brusselsMidnight, formatJournalAmount, formatJournalDate, orderMode, resolveRange } from "./utils";

const payment = (overrides: Partial<FinancePayment> = {}): FinancePayment => ({
  provider: "stripe",
  providerPaymentId: "cs_live_abc",
  mode: "live",
  method: "bancontact",
  status: "PAID",
  amountCents: 3490,
  refundedCents: 0,
  chargedBackCents: 0,
  paymentIntentId: "pi_123",
  createdAt: new Date("2026-11-03T09:00:00Z"),
  ...overrides,
});

const order = (overrides: Partial<FinanceOrder> = {}): FinanceOrder => ({
  id: "o1",
  number: "PLY1042",
  invoiceNumber: "F2026-0007",
  status: "PAID",
  createdBy: null,
  stockOrder: false,
  attentionReason: null,
  createdAt: new Date("2026-11-03T09:00:00Z"),
  paidAt: new Date("2026-11-03T09:05:00Z"),
  firstName: "An",
  lastName: "Peeters",
  email: "an@example.com",
  phone: "+32470000000",
  street: "Kerkstraat",
  houseNumber: "12",
  postalCode: "9000",
  city: "Gent",
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

describe("formats for Excel (nl-BE)", () => {
  it("writes amounts with a decimal comma and no thousands separator", () => {
    expect(formatJournalAmount(3490)).toBe("34,90");
    expect(formatJournalAmount(123456)).toBe("1234,56");
    expect(formatJournalAmount(-995)).toBe("-9,95");
    expect(formatJournalAmount(0)).toBe("0,00");
  });

  it("writes dates as dd/mm/jjjj in Belgian time", () => {
    expect(formatJournalDate(new Date("2026-11-03T09:05:00Z"))).toBe("03/11/2026");
    // 23:30 UTC on 31 October is already 1 November in Brussels.
    expect(formatJournalDate(new Date("2026-10-31T23:30:00Z"))).toBe("01/11/2026");
  });

  it("keeps a cell on one line and never lets Excel read it as a formula", () => {
    expect(textCell("Vlekje\top\nde neus")).toBe("Vlekje op de neus");
    expect(textCell("=HYPERLINK(\"x\")")).toBe("'=HYPERLINK(\"x\")");
    expect(textCell(null)).toBe("");
    // A phone number stays text, with its +, instead of becoming a number.
    expect(textCell("+32470000000")).toBe("'+32470000000");
  });

  it("joins a table into tab-separated text with the header first", () => {
    expect(toTsv({ header: ["A", "B"], rows: [["1", "2"]] })).toBe("A\tB\n1\t2\n");
  });
});

describe("periods", () => {
  it("are whole Belgian days, summer and winter time", () => {
    expect(brusselsMidnight("2026-11-01").toISOString()).toBe("2026-10-31T23:00:00.000Z");
    expect(brusselsMidnight("2026-07-01").toISOString()).toBe("2026-06-30T22:00:00.000Z");
    expect(brusselsMidnight("2026-10-25").toISOString()).toBe("2026-10-24T22:00:00.000Z"); // the day summer time ends
  });

  it("default to this month so far, and refuse a reversed range", () => {
    const range = resolveRange({}, new Date("2026-11-11T10:00:00Z"));
    expect(range).toMatchObject({ from: "2026-11-01", to: "2026-11-11" });
    expect(range.end.toISOString()).toBe("2026-11-11T23:00:00.000Z");
    expect(() => resolveRange({ from: "2026-11-10", to: "2026-11-01" })).toThrow("na de einddatum");
  });
});

describe("Dagontvangsten", () => {
  it("has one row per paid order on its payment day, with Stripe's PaymentIntent as the reference", () => {
    const { header, rows } = receiptsTable([order()]);
    expect(header).toEqual(["Datum", "Omschrijving", "Naam klant", "Bedrag", "Betaald", "Betalingsreferentie", "Verzending"]);
    expect(rows).toEqual([["03/11/2026", "F2026-0007 · PLY1042 · Bancontact", "An Peeters", "34,90", "ja", "pi_123", "ja"]]);
  });

  it("falls back to the Checkout Session, and uses the order number for money recorded by hand", () => {
    expect(receiptsTable([order({ payments: [payment({ paymentIntentId: null })] })]).rows[0][5]).toBe("cs_live_abc");
    const cash = order({ createdBy: "Maarten", deliveryType: "HANDOVER", payments: [payment({ provider: "manual", mode: null, method: "cash", paymentIntentId: null })] });
    expect(receiptsTable([cash]).rows[0]).toEqual(["03/11/2026", "F2026-0007 · PLY1042 · Contant", "An Peeters", "34,90", "ja", "PLY1042", "nee"]);
  });

  it("lists gifts and free orders as not paid, leaves stock orders out, and sorts by payment day", () => {
    const gift = order({ number: "PLY1050", invoiceNumber: "F2026-0009", paidAt: new Date("2026-11-05T10:00:00Z"), payments: [payment({ provider: "manual", method: "gift" })] });
    const free = order({ number: "PLY1049", invoiceNumber: "F2026-0008", paidAt: new Date("2026-11-04T10:00:00Z"), totalCents: 0, payments: [payment({ provider: "manual", method: "discount", amountCents: 0 })] });
    const stock = order({ number: "PLY1051", stockOrder: true, payments: [payment({ provider: "manual", method: "stock", amountCents: 0 })] });
    const unpaid = order({ number: "PLY1052", paidAt: null, payments: [payment({ status: "OPEN" })] });
    const rows = receiptsTable([gift, stock, free, order(), unpaid]).rows;
    expect(rows.map((row) => row[1].split(" · ")[1])).toEqual(["PLY1042", "PLY1049", "PLY1050"]);
    expect(rows.map((row) => row[4])).toEqual(["ja", "nee", "nee"]);
    expect(rows[2][3]).toBe("34,90"); // a gift keeps its invoiced amount
  });
});

describe("Gegevens klanten", () => {
  it("has one row per customer with their newest details, NVT for the VAT number and empty fields we don't have", () => {
    const later = order({ id: "o2", number: "PLY1060", paidAt: new Date("2026-11-20T10:00:00Z"), street: "Nieuwstraat", houseNumber: "3", email: "AN@example.com" });
    const friend = order({ id: "o3", email: null, firstName: "Bart", lastName: "Claes", phone: null, street: null, houseNumber: null, postalCode: null });
    const { header, rows } = customersTable([order(), later, friend]);
    expect(header).toEqual(["Naam klant", "Straat + nr", "Postcode", "Land", "Btw-nr klant", "Contactpersoon", "E-mailadres", "Website", "Telefoonnummer"]);
    expect(rows).toEqual([
      ["An Peeters", "Nieuwstraat 3", "9000", "België", "NVT", "", "AN@example.com", "", "'+32470000000"],
      ["Bart Claes", "", "", "België", "NVT", "", "", "", ""],
    ]);
  });
});

describe("Financieel dagboek", () => {
  const refund = (overrides: Partial<FinanceAdjustment> = {}): FinanceAdjustment => ({
    id: "a1",
    kind: "REFUND",
    amountCents: 1000,
    occurredAt: new Date("2026-11-04T08:00:00Z"),
    order: { id: "o1", number: "PLY1042", invoiceNumber: "F2026-0007", stockOrder: false, firstName: "An", lastName: "Peeters" },
    payment: { provider: "stripe", providerPaymentId: "cs_live_abc", mode: "live", method: "bancontact", paymentIntentId: "pi_123" },
    ...overrides,
  });

  it("books money in as ontvangst and refunds as uitgave on their own day", () => {
    const gift = order({ number: "PLY1050", payments: [payment({ provider: "manual", method: "gift" })] });
    const { header, rows } = ledgerTable([order(), gift], [refund()]);
    expect(header).toEqual(["Datum", "Omschrijving", "Ontvangst", "Uitgave"]);
    expect(rows).toEqual([
      ["03/11/2026", "Ontvangst F2026-0007 · PLY1042 · Bancontact · An Peeters", "34,90", ""],
      ["04/11/2026", "Terugbetaling F2026-0007 · PLY1042 · An Peeters", "", "10,00"],
    ]);
  });

  it("books a chargeback as uitgave and one that was undone as ontvangst", () => {
    const rows = ledgerTable([], [refund({ kind: "CHARGEBACK", amountCents: 3490 }), refund({ id: "a2", kind: "CHARGEBACK", amountCents: -3490, occurredAt: new Date("2026-11-20T08:00:00Z") })]).rows;
    expect(rows.map((row) => [row[1].split(" F")[0], row[2], row[3]])).toEqual([
      ["Chargeback", "", "34,90"],
      ["Chargeback teruggedraaid", "34,90", ""],
    ]);
  });
});

describe("test and live", () => {
  it("counts a payment recorded by hand as live", () => {
    expect(orderMode(order({ payments: [payment({ provider: "manual", mode: null, method: "cash" })] }))).toBe("live");
    expect(orderMode(order({ payments: [payment({ mode: "test" })] }))).toBe("test");
  });
});
