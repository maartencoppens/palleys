import type { FinanceAdjustment, FinanceOrder, JournalTable, JournalTableData } from "./types";
import {
  customerName,
  formatJournalAmount,
  formatJournalDate,
  isShipped,
  methodKey,
  methodLabel,
  paymentReference,
  receivedCents,
  settledPayment,
} from "./utils";

/*
 * The sales journal ("verkoopdagboek") in three tables, to paste straight into our Excel. Pure: the service reads the
 * orders and refunds, this turns them into rows.
 *
 * - The day that counts is the payment day (Order.paidAt): that is when the money came in and the invoice number was
 *   given. Refunds and chargebacks count on the day we saw them (PaymentAdjustment.occurredAt).
 * - Stock orders are left out: nobody bought anything.
 * - A gift or an order a discount made free is in "Dagontvangsten" (it has an invoice number), paid "nee"; it has no
 *   money line in the "Financieel dagboek".
 * - Refunds are an "uitgave" in the "Financieel dagboek"; a refund or chargeback undone is an "ontvangst".
 */

export const RECEIPTS_HEADER = ["Datum", "Omschrijving", "Naam klant", "Bedrag", "Betaald", "Betalingsreferentie", "Verzending"];
export const CUSTOMERS_HEADER = [
  "Naam klant",
  "Straat + nr",
  "Postcode",
  "Land",
  "Btw-nr klant",
  "Contactpersoon",
  "E-mailadres",
  "Website",
  "Telefoonnummer",
];
export const LEDGER_HEADER = ["Datum", "Omschrijving", "Ontvangst", "Uitgave"];

const yesNo = (value: boolean) => (value ? "ja" : "nee");

/**
 * A cell as text Excel takes as it is: no tabs or line breaks (those would split it), and text that starts like a formula
 * (=, +, -, @) gets an apostrophe so Excel never runs it. Our own amounts don't go through this.
 */
export function textCell(value: string | null | undefined) {
  const flat = (value ?? "").replace(/[\t\r\n]+/g, " ").trim();
  return /^[=+\-@]/.test(flat) ? `'${flat}` : flat;
}

/** Tab-separated with a header row: what Excel splits into columns on paste. */
export function toTsv(table: JournalTableData) {
  return [table.header, ...table.rows].map((row) => row.join("\t")).join("\n") + "\n";
}

const inJournal = (order: FinanceOrder) => !order.stockOrder && order.paidAt !== null;
const byPaidAt = (a: FinanceOrder, b: FinanceOrder) => a.paidAt!.getTime() - b.paidAt!.getTime() || a.number.localeCompare(b.number);

const describeOrder = (order: Pick<FinanceOrder, "number" | "invoiceNumber">) => [order.invoiceNumber, order.number].filter(Boolean).join(" · ");

export function receiptsTable(orders: FinanceOrder[]): JournalTableData {
  const rows = orders
    .filter(inJournal)
    .sort(byPaidAt)
    .map((order) => {
      const payment = settledPayment(order);
      return [
        formatJournalDate(order.paidAt!),
        textCell(`${describeOrder(order)} · ${methodLabel(methodKey(payment))}`),
        textCell(customerName(order)),
        formatJournalAmount(order.totalCents),
        yesNo(receivedCents(order) > 0),
        textCell(paymentReference(order, payment)),
        yesNo(isShipped(order)),
      ];
    });
  return { header: RECEIPTS_HEADER, rows };
}

const countryNames = new Intl.DisplayNames(["nl-BE"], { type: "region" });
const countryName = (code: string) => {
  try {
    return countryNames.of(code) ?? code;
  } catch {
    return code;
  }
};

/** One row per customer (on e-mail, else on name), with their details from their latest order in the period. */
export function customersTable(orders: FinanceOrder[]): JournalTableData {
  const latest = new Map<string, FinanceOrder>();
  for (const order of orders.filter(inJournal).sort(byPaidAt)) {
    const key = order.email?.trim().toLowerCase() || `name:${customerName(order).toLowerCase()}`;
    latest.set(key, order); // later orders overwrite: the newest address wins
  }
  const rows = [...latest.values()]
    .sort((a, b) => customerName(a).localeCompare(customerName(b), "nl"))
    .map((order) => [
      textCell(customerName(order)),
      textCell([order.street, order.houseNumber].filter(Boolean).join(" ")),
      textCell(order.postalCode),
      textCell(countryName(order.country)),
      "NVT", // we sell to consumers: no VAT numbers asked
      "",
      textCell(order.email),
      "",
      textCell(order.phone),
    ]);
  return { header: CUSTOMERS_HEADER, rows };
}

const ADJUSTMENT_LABELS = {
  REFUND: { out: "Terugbetaling", back: "Terugbetaling teruggedraaid" },
  CHARGEBACK: { out: "Chargeback", back: "Chargeback teruggedraaid" },
} as const;

export function ledgerTable(orders: FinanceOrder[], adjustments: FinanceAdjustment[]): JournalTableData {
  type Line = { at: Date; description: string; inCents: number; outCents: number };
  const lines: Line[] = [];
  for (const order of orders.filter(inJournal)) {
    const cents = receivedCents(order);
    if (cents <= 0) continue;
    const payment = settledPayment(order);
    lines.push({ at: order.paidAt!, description: `Ontvangst ${describeOrder(order)} · ${methodLabel(methodKey(payment))} · ${customerName(order)}`, inCents: cents, outCents: 0 });
  }
  for (const adjustment of adjustments) {
    if (adjustment.order.stockOrder || adjustment.amountCents === 0) continue;
    const labels = ADJUSTMENT_LABELS[adjustment.kind];
    const out = adjustment.amountCents > 0;
    lines.push({
      at: adjustment.occurredAt,
      description: `${out ? labels.out : labels.back} ${describeOrder(adjustment.order)} · ${customerName(adjustment.order)}`,
      inCents: out ? 0 : -adjustment.amountCents,
      outCents: out ? adjustment.amountCents : 0,
    });
  }
  const rows = lines
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map((line) => [
      formatJournalDate(line.at),
      textCell(line.description),
      line.inCents ? formatJournalAmount(line.inCents) : "",
      line.outCents ? formatJournalAmount(line.outCents) : "",
    ]);
  return { header: LEDGER_HEADER, rows };
}

export const JOURNAL_TABLE_LABELS: Record<JournalTable, string> = {
  receipts: "Dagontvangsten",
  customers: "Gegevens klanten",
  ledger: "Financieel dagboek",
};

const FILE_PARTS: Record<JournalTable, string> = { receipts: "dagontvangsten", customers: "klanten", ledger: "financieel-dagboek" };

/** The file name for a download of one table: verkoopdagboek-dagontvangsten-2026-11-01-2026-11-30.tsv */
export const journalFileName = (table: JournalTable, from: string, to: string) => `verkoopdagboek-${FILE_PARTS[table]}-${from}-${to}.tsv`;
