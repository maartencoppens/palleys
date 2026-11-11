import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderPayment } from "@/core/modules/payments/providers/types";

/*
 * The sales journal and the finance overview over real rows in the local database: orders added by hand (cash, a gift,
 * a stock order), one paid through Stripe (mocked) and refunded there, and one refunded by hand. Every order is moved to
 * March 2019 so nothing else in the development database falls in the period.
 */

const stripe = vi.hoisted(() => ({ payments: new Map<string, ProviderPayment>(), mode: "live" as "live" | "test" }));
vi.mock("@/core/modules/payments/providers", () => ({
  paymentProvider: {
    name: "stripe",
    isConfigured: () => true,
    mode: () => stripe.mode,
    isCheckoutUrl: (url: string) => url.startsWith("https://checkout.stripe.com/"),
    isPaymentId: (id: string) => /^cs_(test|live)_[A-Za-z0-9]+$/.test(id),
    async createPayment(input: { amountCents: number; reference: string }) {
      const id = `cs_${stripe.mode}_${randomUUID().replaceAll("-", "")}`;
      const payment: ProviderPayment = {
        id,
        status: "OPEN",
        mode: stripe.mode,
        method: null,
        amountCents: input.amountCents,
        currency: "EUR",
        refundedCents: 0,
        chargedBackCents: 0,
        reference: input.reference,
        checkoutUrl: `https://checkout.stripe.com/c/pay/${id}`,
        snapshot: { sessionId: id, paymentIntentId: null },
      };
      stripe.payments.set(id, payment);
      return payment;
    },
    async getPayment(id: string) {
      return stripe.payments.get(id)!;
    },
  },
}));
vi.mock("@/core/networking/external/storage-client", () => ({
  objectExists: async () => true,
  createDownloadUrl: async (key: string) => `https://r2.test/${key}`,
  createUploadUrl: async (key: string) => `https://r2.test/upload/${key}`,
  putObject: async () => undefined,
  deleteObject: async () => undefined,
  getObject: async () => Buffer.from(""),
}));
vi.mock("@/core/networking/external/email-client", () => ({
  EmailError: class EmailError extends Error {},
  isEmailConfigured: () => false,
  sendEmail: async () => false,
}));
// Outside a real request: the route's connection() has nothing to wait for.
vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/server")>()), connection: async () => undefined }));
const auth = vi.hoisted(() => ({ admin: true }));
vi.mock("@/core/modules/auth/service", async () => {
  class UnauthorizedError extends Error {}
  return {
    UnauthorizedError,
    requireAdmin: async () => {
      if (!auth.admin) throw new UnauthorizedError();
      return { user: { name: "Test Admin" } };
    },
  };
});

const { prisma } = await import("@/db/client");
const { createManualOrder, updateOrderStatus } = await import("@/core/modules/orders/admin");
const { manualOrderSchema } = await import("@/core/modules/orders/types");
const { handlePaymentWebhook } = await import("@/core/modules/payments/service");
const { getFinanceOverview, getSalesJournal } = await import("./service");
const { journalQuerySchema, financeQuerySchema } = await import("./types");
const { GET } = await import("@/app/api/admin/finance/journal/route");

const ADMIN = "Test Admin";
const PERIOD = { from: "2019-03-01", to: "2019-03-31" };
const createdOrders = new Set<string>();
const suffix = randomUUID().slice(0, 6);

async function addOrder(lastName: string, payment: object, extra: object = {}) {
  const result = await createManualOrder(
    manualOrderSchema.parse({
      customer: { firstName: "Fin", lastName: `${lastName} ${suffix}`, email: `${lastName.toLowerCase()}-${suffix}@example.com` },
      lines: [{ kind: "personalized", animal: "dog", edition: "keychain", quantity: 1, unitCents: 3000 }],
      delivery: { type: "handover" },
      payment,
      sendConfirmation: false,
      ...extra,
    }),
    ADMIN,
  );
  createdOrders.add(result.orderId);
  return result.orderId;
}

/** Moves an order's payment day into the test period (Brussels time). */
const paidOn = (orderId: string, iso: string) => prisma.order.update({ where: { id: orderId }, data: { paidAt: new Date(iso) } });

const ids = { cash: "", gift: "", stripe: "", refundedByHand: "", testMode: "" };
let collectibleId = "";

beforeEach(() => {
  auth.admin = true;
});

afterAll(async () => {
  const orderIds = [...createdOrders];
  const items = await prisma.orderItem.findMany({ where: { orderId: { in: orderIds } }, select: { previewId: true } });
  await prisma.orderStatusChange.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } }); // adjustments go with them (cascade)
  await prisma.shipment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.preview.deleteMany({ where: { id: { in: items.flatMap((item) => item.previewId ?? []) } } });
  if (collectibleId) await prisma.collectible.delete({ where: { id: collectibleId } });
  await prisma.$disconnect();
});

describe("money in and out, recorded with a date", () => {
  it("sets up the period: cash, a gift, a stock order, a Stripe payment refunded in part, a refund by hand", async () => {
    ids.cash = await addOrder("Contant", { type: "paid", method: "cash" });
    await paidOn(ids.cash, "2019-03-05T10:00:00Z");
    ids.gift = await addOrder("Geschenk", { type: "paid", method: "gift" });
    await paidOn(ids.gift, "2019-03-06T10:00:00Z");
    const collectible = await prisma.collectible.create({ data: { slug: `fin-test-${suffix}`, name: "Fin testmodel", priceCents: 1995 } });
    collectibleId = collectible.id;
    const stock = await addOrder("Voorraad", { type: "later" }, { stockOrder: true, lines: [{ kind: "collectible", collectibleId, quantity: 2 }] });
    expect(stock).toBeTruthy();
    await paidOn(stock, "2019-03-06T11:00:00Z");

    // Through Stripe: paid, then refunded in part. The second sync with the same totals logs nothing new.
    ids.stripe = await addOrder("Stripe", { type: "link" });
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: ids.stripe } });
    const paid = { ...stripe.payments.get(payment.providerPaymentId)!, status: "PAID" as const, method: "bancontact" };
    stripe.payments.set(payment.providerPaymentId, { ...paid, snapshot: { paymentIntentId: "pi_fintest" } });
    await handlePaymentWebhook(payment.providerPaymentId);
    await paidOn(ids.stripe, "2019-03-07T22:30:00Z"); // 23:30 in Brussels: still 7 March
    stripe.payments.set(payment.providerPaymentId, { ...paid, refundedCents: 1000, snapshot: { paymentIntentId: "pi_fintest" } });
    await handlePaymentWebhook(payment.providerPaymentId);
    await handlePaymentWebhook(payment.providerPaymentId);
    const adjustments = await prisma.paymentAdjustment.findMany({ where: { paymentId: payment.id } });
    expect(adjustments).toEqual([expect.objectContaining({ kind: "REFUND", amountCents: 1000, source: "webhook" })]);
    await prisma.paymentAdjustment.updateMany({ where: { paymentId: payment.id }, data: { occurredAt: new Date("2019-03-10T09:00:00Z") } });

    // Paid in cash, refunded in cash: the whole amount, on the day of the refund.
    ids.refundedByHand = await addOrder("Terug", { type: "paid", method: "transfer" });
    await paidOn(ids.refundedByHand, "2019-03-08T10:00:00Z");
    await updateOrderStatus(ids.refundedByHand, { status: "REFUNDED" }, ADMIN);
    const manual = await prisma.payment.findFirstOrThrow({ where: { orderId: ids.refundedByHand }, include: { adjustments: true } });
    expect(manual.refundedCents).toBe(manual.amountCents);
    expect(manual.adjustments).toEqual([expect.objectContaining({ kind: "REFUND", amountCents: manual.amountCents, source: `admin:${ADMIN}` })]);
    await prisma.paymentAdjustment.updateMany({ where: { paymentId: manual.id }, data: { occurredAt: new Date("2019-03-12T09:00:00Z") } });

    // A Stripe test payment in the same period: only with mode=test.
    stripe.mode = "test";
    ids.testMode = await addOrder("Test", { type: "link" });
    const testPayment = await prisma.payment.findFirstOrThrow({ where: { orderId: ids.testMode } });
    stripe.payments.set(testPayment.providerPaymentId, { ...stripe.payments.get(testPayment.providerPaymentId)!, status: "PAID", method: "ideal" });
    await handlePaymentWebhook(testPayment.providerPaymentId);
    await paidOn(ids.testMode, "2019-03-09T10:00:00Z");
    stripe.mode = "live";
  });
});

describe("sales journal", () => {
  it("lists the receipts on their payment day, without the stock order or test payments", async () => {
    const journal = await getSalesJournal(journalQuerySchema.parse(PERIOD));
    const orders = await prisma.order.findMany({ where: { id: { in: [...createdOrders] } }, select: { id: true, number: true, invoiceNumber: true, totalCents: true } });
    const byId = Object.fromEntries(orders.map((order) => [order.id, order]));
    const ours = journal.receipts.rows.filter((row) => row[2].endsWith(suffix));

    expect(ours).toEqual([
      ["05/03/2019", `${byId[ids.cash].invoiceNumber} · ${byId[ids.cash].number} · Contant`, `Fin Contant ${suffix}`, "30,00", "ja", byId[ids.cash].number, "nee"],
      ["06/03/2019", `${byId[ids.gift].invoiceNumber} · ${byId[ids.gift].number} · Geschenk (geen betaling)`, `Fin Geschenk ${suffix}`, "30,00", "nee", byId[ids.gift].number, "nee"],
      ["07/03/2019", `${byId[ids.stripe].invoiceNumber} · ${byId[ids.stripe].number} · Bancontact`, `Fin Stripe ${suffix}`, "30,00", "ja", "pi_fintest", "nee"],
      ["08/03/2019", `${byId[ids.refundedByHand].invoiceNumber} · ${byId[ids.refundedByHand].number} · Overschrijving`, `Fin Terug ${suffix}`, "30,00", "ja", byId[ids.refundedByHand].number, "nee"],
    ]);
    expect(journal.customers.rows.filter((row) => row[0].endsWith(suffix)).map((row) => row[6])).toEqual([
      `contant-${suffix}@example.com`,
      `geschenk-${suffix}@example.com`,
      `stripe-${suffix}@example.com`,
      `terug-${suffix}@example.com`,
    ]);

    const ledger = journal.ledger.rows.filter((row) => row[1].endsWith(suffix));
    expect(ledger.map((row) => [row[0], row[1].split(" ")[0], row[2], row[3]])).toEqual([
      ["05/03/2019", "Ontvangst", "30,00", ""],
      ["07/03/2019", "Ontvangst", "30,00", ""],
      ["08/03/2019", "Ontvangst", "30,00", ""],
      ["10/03/2019", "Terugbetaling", "", "10,00"],
      ["12/03/2019", "Terugbetaling", "", "30,00"],
    ]);

    const test = await getSalesJournal(journalQuerySchema.parse({ ...PERIOD, mode: "test" }));
    expect(test.receipts.rows.filter((row) => row[2].endsWith(suffix)).map((row) => row[2])).toEqual([`Fin Test ${suffix}`]);
  });

  it("is served as TSV to admins only", async () => {
    const response = await GET(new Request(`http://localhost/api/admin/finance/journal?from=${PERIOD.from}&to=${PERIOD.to}&format=tsv&table=ledger`));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/tab-separated-values");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const text = await response.text();
    expect(text.split("\n")[0]).toBe("Datum\tOmschrijving\tOntvangst\tUitgave");

    expect((await GET(new Request("http://localhost/api/admin/finance/journal?format=tsv"))).status).toBe(400);
    expect((await GET(new Request("http://localhost/api/admin/finance/journal?from=2019-03-31&to=2019-03-01"))).status).toBe(400);
    auth.admin = false;
    expect((await GET(new Request(`http://localhost/api/admin/finance/journal?from=${PERIOD.from}`))).status).toBe(401);
  });
});

describe("finance overview", () => {
  it("adds up live money, refunds and methods, and filters on method", async () => {
    // Only our orders are in March 2019, so the totals are exactly theirs.
    const overview = await getFinanceOverview(financeQuerySchema.parse(PERIOD));
    expect(overview.summary).toMatchObject({
      grossCents: 9000,
      refundedCents: 4000,
      chargebackCents: 0,
      netCents: 5000,
      paidOrders: 4,
      moneyOrders: 3,
      freeOrders: 1,
      averageOrderCents: 3000,
    });
    expect(overview.summary.byMethod.map((row) => row.key).sort()).toEqual(["bancontact", "cash", "gift", "transfer"]);
    expect(overview.orders.map((order) => order.number)).toHaveLength(4);

    const cash = await getFinanceOverview(financeQuerySchema.parse({ ...PERIOD, method: "cash" }));
    expect(cash.summary).toMatchObject({ grossCents: 3000, paidOrders: 1, refundedCents: 0 });

    const test = await getFinanceOverview(financeQuerySchema.parse({ ...PERIOD, mode: "test" }));
    expect(test.summary).toMatchObject({ grossCents: 3000, paidOrders: 1 });
  });
});
