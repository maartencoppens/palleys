import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderPayment } from "./providers/types";

/*
 * End-to-end over our own code with Bancontact, R2 and Resend mocked: cart → checkout → payment status → order PAID →
 * preview PAID (which is what puts it in the backoffice's "Te reviewen" list). Runs against the local database.
 */

const bancontact = vi.hoisted(() => ({
  payments: new Map<string, ProviderPayment>(),
  getCalls: 0,
}));

vi.mock("@/core/modules/payments/providers", () => ({
  paymentProvider: {
    name: "bancontact",
    isConfigured: () => true,
    mode: () => "test",
    isCheckoutUrl: (url: string) => url.startsWith("https://pay.bancontact.net/"),
    isPaymentId: (id: string) => /^[A-Za-z0-9]{16,40}$/.test(id),
    parseCallback: async () => ({ ok: false, reason: "not used here" }),
    async createPayment(input: { amountCents: number; reference: string }) {
      const id = randomUUID().replaceAll("-", "").slice(0, 24);
      const payment: ProviderPayment = {
        id,
        status: "OPEN",
        mode: "test",
        method: "bancontact",
        amountCents: input.amountCents,
        currency: "EUR",
        refundedCents: 0,
        chargedBackCents: 0,
        reference: input.reference,
        checkoutUrl: `https://pay.bancontact.net/?checkoutApi=https://merchant.api.preprod.bancontact.net/v3/payments/${id}`,
        snapshot: { id },
      };
      bancontact.payments.set(id, payment);
      return payment;
    },
    async getPayment(id: string) {
      bancontact.getCalls++;
      const payment = bancontact.payments.get(id);
      if (!payment) throw new Error("not found");
      return payment;
    },
    async refund() {
      return { id: "re_test", status: "pending" };
    },
  },
}));

vi.mock("@/core/networking/external/storage-client", () => ({
  objectExists: async () => true,
  createDownloadUrl: async (key: string) => `https://r2.test/${key}`,
}));

vi.mock("@/core/networking/external/email-client", () => ({
  isEmailConfigured: () => false,
  sendEmail: async () => false,
}));

const { prisma } = await import("@/db/client");
const { addPreviewToCart, getCart } = await import("@/core/modules/cart/service");
const { startCheckout, CheckoutError } = await import("@/core/modules/checkout/service");
const { checkoutSchema } = await import("@/core/modules/checkout/types");
const { handlePaymentWebhook, processPayment, syncOrderPayment } = await import("./service");
const { getOrderStatusForCustomer } = await import("@/core/modules/orders/service");

const createdPreviews: string[] = [];
const createdOrders: string[] = [];

async function newPreview() {
  const id = randomUUID();
  await prisma.preview.create({
    data: {
      id,
      expiresAt: new Date(Date.now() + 86_400_000),
      photos: { create: [{ key: `previews/${id}/photo-test.jpg` }] },
    },
  });
  createdPreviews.push(id);
  return id;
}

const customer = {
  email: "Test.Klant@Example.com",
  firstName: "Test",
  lastName: "Klant",
  street: "Teststraat",
  houseNumber: "1",
  postalCode: "9000",
  city: "Gent",
  country: "BE",
  deliveryOptionId: "be-bpost-home",
  acceptTerms: true,
};

async function checkout(previewId: string, quantity = 1) {
  const { token } = await addPreviewToCart(null, { previewId, animal: "dog", edition: "keychain" });
  if (quantity > 1) {
    const line = await prisma.cartLine.findFirstOrThrow({ where: { previewId } });
    await prisma.cartLine.update({ where: { id: line.id }, data: { quantity } });
  }
  const { checkoutUrl } = await startCheckout(token, checkoutSchema.parse(customer));
  const payment = await prisma.payment.findFirstOrThrow({
    where: { checkoutUrl },
    include: { order: true },
  });
  createdOrders.push(payment.orderId);
  return { token, checkoutUrl, payment, order: payment.order };
}

function setProviderStatus(id: string, patch: Partial<ProviderPayment>) {
  bancontact.payments.set(id, { ...bancontact.payments.get(id)!, ...patch });
}

beforeEach(async () => {
  await prisma.shopSettings.deleteMany({ where: { id: 1 } });
});

afterAll(async () => {
  await prisma.orderStatusChange.deleteMany({ where: { orderId: { in: createdOrders } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrders } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: createdOrders } } });
  await prisma.shipment.deleteMany({ where: { orderId: { in: createdOrders } } });
  await prisma.order.deleteMany({ where: { id: { in: createdOrders } } });
  await prisma.cart.deleteMany({ where: { lines: { some: { previewId: { in: createdPreviews } } } } });
  await prisma.preview.deleteMany({ where: { id: { in: createdPreviews } } });
  await prisma.$disconnect();
});

describe("checkout", () => {
  it("creates an order with server-side totals, a sequential number and an open payment", async () => {
    const previewId = await newPreview();
    const { order, payment, checkoutUrl } = await checkout(previewId, 2);

    expect(checkoutUrl).toMatch(/^https:\/\/pay\.bancontact\.net\//);
    expect(order.number).toMatch(/^PAL-\d{4}-\d{5}$/);
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.email).toBe("test.klant@example.com");
    expect(order.subtotalCents).toBe(2 * 2799);
    expect(order.shippingCents).toBe(495);
    expect(order.totalCents).toBe(2 * 2799 + 495);
    expect(order.vatCents).toBe(Math.round(((2 * 2799 + 495) * 21) / 121));
    expect(order.termsVersion).toBeTruthy();
    expect(payment.amountCents).toBe(order.totalCents);
    expect(payment.status).toBe("OPEN");
  });

  it("uses the shipping price an admin set, and refuses disabled options", async () => {
    await prisma.shopSettings.create({
      data: { id: 1, shippingOverrides: { "be-bpost-home": { priceCents: 0, enabled: true } } },
    });
    const { order } = await checkout(await newPreview());
    expect(order.shippingCents).toBe(0);

    await prisma.shopSettings.update({
      where: { id: 1 },
      data: { shippingOverrides: { "be-bpost-home": { priceCents: 495, enabled: false } } },
    });
    const previewId = await newPreview();
    const { token } = await addPreviewToCart(null, { previewId, animal: "cat", edition: "figure" });
    await expect(startCheckout(token, checkoutSchema.parse(customer))).rejects.toMatchObject({
      code: "delivery_option_invalid",
    });
  });

  it("refuses an empty cart and a paused checkout", async () => {
    await expect(startCheckout(null, checkoutSchema.parse(customer))).rejects.toBeInstanceOf(CheckoutError);
    await prisma.shopSettings.create({ data: { id: 1, checkoutEnabled: false } });
    const previewId = await newPreview();
    const { token } = await addPreviewToCart(null, { previewId, animal: "cat", edition: "figure" });
    await expect(startCheckout(token, checkoutSchema.parse(customer))).rejects.toMatchObject({ code: "checkout_closed" });
  });

  it("rejects input the client must not decide (terms not accepted, unknown country)", () => {
    expect(checkoutSchema.safeParse({ ...customer, acceptTerms: false }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...customer, country: "NL" }).success).toBe(false); // Belgium only
    expect(checkoutSchema.safeParse({ ...customer, postalCode: "123" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...customer, firstName: "<script>" }).success).toBe(false);
  });
});

describe("payment processing", () => {
  it("marks order and preview paid once, and empties the cart", async () => {
    const previewId = await newPreview();
    const { order, payment, token } = await checkout(previewId);

    setProviderStatus(payment.providerPaymentId, { status: "PAID" });
    const first = await handlePaymentWebhook(payment.providerPaymentId);
    expect(first).toMatchObject({ outcome: "processed", orderStatus: "PAID" });

    const paidOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { statusChanges: true } });
    expect(paidOrder.status).toBe("PAID");
    expect(paidOrder.paidAt).not.toBeNull();
    expect(paidOrder.attentionReason).toBeNull();

    const preview = await prisma.preview.findUniqueOrThrow({ where: { id: previewId } });
    expect(preview).toMatchObject({
      status: "PAID", // → shows up in /admin/review
      orderNumber: order.number,
      email: "test.klant@example.com",
      animalType: "HOND",
      quantity: 1,
      expiresAt: null,
    });

    // Second identical webhook: nothing changes.
    await handlePaymentWebhook(payment.providerPaymentId);
    const again = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { statusChanges: true } });
    expect(again.statusChanges.filter((c) => c.toStatus === "PAID")).toHaveLength(1);

    const cart = await getCart(token);
    expect(cart?.lines ?? []).toHaveLength(0);

    // Mail not configured: not marked as sent, so it can be resent later.
    expect(again.confirmationSentAt).toBeNull();
  });

  it("never marks an order paid when the amount or reference doesn't match", async () => {
    const { order, payment } = await checkout(await newPreview());
    setProviderStatus(payment.providerPaymentId, { status: "PAID", amountCents: 1 });
    expect(await handlePaymentWebhook(payment.providerPaymentId)).toMatchObject({ outcome: "mismatch" });

    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe("PENDING_PAYMENT");
    expect(after.attentionReason).toContain("bedrag");

    setProviderStatus(payment.providerPaymentId, { amountCents: order.totalCents, reference: "PAL-1999-00001" });
    expect(await handlePaymentWebhook(payment.providerPaymentId)).toMatchObject({ outcome: "mismatch" });
  });

  it("closes expired and canceled payments", async () => {
    const a = await checkout(await newPreview());
    setProviderStatus(a.payment.providerPaymentId, { status: "EXPIRED" });
    await handlePaymentWebhook(a.payment.providerPaymentId);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: a.order.id } })).status).toBe("EXPIRED");

    const b = await checkout(await newPreview());
    setProviderStatus(b.payment.providerPaymentId, { status: "CANCELED" });
    await handlePaymentWebhook(b.payment.providerPaymentId);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: b.order.id } })).status).toBe("CANCELLED");

    // A late payment on a closed order is still recorded.
    setProviderStatus(b.payment.providerPaymentId, { status: "PAID" });
    await handlePaymentWebhook(b.payment.providerPaymentId);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: b.order.id } })).status).toBe("PAID");
  });

  it("flags a preview that was already paid in another order", async () => {
    const previewId = await newPreview();
    const first = await checkout(previewId);
    const second = await checkout(previewId); // same preview, second cart (e.g. two tabs)

    setProviderStatus(first.payment.providerPaymentId, { status: "PAID" });
    await processPayment(bancontact.payments.get(first.payment.providerPaymentId)!, "webhook");
    setProviderStatus(second.payment.providerPaymentId, { status: "PAID" });
    await processPayment(bancontact.payments.get(second.payment.providerPaymentId)!, "webhook");

    const flagged = await prisma.order.findUniqueOrThrow({ where: { id: second.order.id } });
    expect(flagged.status).toBe("PAID");
    expect(flagged.attentionReason).toContain("dubbel betaald");
  });

  it("ignores callbacks for unknown or malformed ids without calling Bancontact", async () => {
    const before = bancontact.getCalls;
    expect(await handlePaymentWebhook("aaaaaaaaaaaaaaaaaaaaaaaa")).toEqual({ outcome: "unknown_payment" });
    expect(await handlePaymentWebhook("not-an-id")).toEqual({ outcome: "unknown_payment" });
    expect(bancontact.getCalls).toBe(before);
  });

  it("throttles return-page syncs", async () => {
    const { order } = await checkout(await newPreview());
    const before = bancontact.getCalls;
    await Promise.all([1, 2, 3, 4, 5].map(() => syncOrderPayment(order.id, "return-page")));
    expect(bancontact.getCalls - before).toBe(1);
  });
});

describe("order status for the return page", () => {
  it("needs the token from the redirect URL", async () => {
    const { order, checkoutUrl } = await checkout(await newPreview());
    expect(checkoutUrl).toBeTruthy();
    expect(await getOrderStatusForCustomer(order.id, "wrong-token")).toBeNull();
    expect(await getOrderStatusForCustomer(order.id, null)).toBeNull();
    expect(await getOrderStatusForCustomer("not-a-uuid", "x")).toBeNull();
  });
});
