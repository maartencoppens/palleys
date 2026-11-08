import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderPayment } from "@/core/modules/payments/providers/types";

/* Discount codes through the real checkout and database, with Bancontact, R2 and Resend mocked. */

const created = vi.hoisted(() => ({ amounts: [] as number[], payments: new Map<string, ProviderPayment>() }));

vi.mock("@/core/modules/payments/providers", () => ({
  paymentProvider: {
    name: "bancontact",
    isConfigured: () => true,
    mode: () => "test",
    isCheckoutUrl: (url: string) => url.startsWith("https://pay.bancontact.net/"),
    isPaymentId: () => true,
    parseCallback: async () => ({ ok: false, reason: "not used here" }),
    async createPayment(input: { amountCents: number; reference: string }) {
      created.amounts.push(input.amountCents);
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
        checkoutUrl: `https://pay.bancontact.net/?id=${id}`,
        snapshot: { id },
      };
      created.payments.set(id, payment);
      return payment;
    },
    async getPayment(id: string) {
      return created.payments.get(id);
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
const { addCollectibleToCart, getCart, updateCartLineQuantity } = await import("@/core/modules/cart/service");
const { applyCheckoutDiscount, listDeliveryOptions, startCheckout, CheckoutError } = await import("@/core/modules/checkout/service");
const { checkoutSchema } = await import("@/core/modules/checkout/types");
const { processPayment } = await import("@/core/modules/payments/service");
const { getOrderStatusForCustomer } = await import("@/core/modules/orders/service");
const { deleteDiscount, DiscountInUseError } = await import("./service");
const { getDeliveryOptions } = await import("@/core/modules/shipping/service");
const { hashToken } = await import("@/core/utils/tokens");

const PRICE = 2000;
let collectibleId = "";
const codes: string[] = [];
const carts: string[] = [];
const orders = () => prisma.order.findMany({ where: { discountCode: { in: codes } }, select: { id: true } });

async function shipping() {
  const [option] = await getDeliveryOptions({ country: "BE", postalCode: "9000" }, [{ size: "M", quantity: 1 }]);
  return option;
}

async function newCode(fields: Partial<Parameters<typeof prisma.discountCode.create>[0]["data"]> = {}) {
  const code = `TEST-${randomUUID().slice(0, 8).toUpperCase()}`;
  codes.push(code);
  await prisma.discountCode.create({ data: { code, type: "PERCENTAGE", value: 10, ...fields } });
  return code;
}

async function newCart() {
  const { token } = await addCollectibleToCart(null, { collectibleId });
  carts.push(token);
  return token;
}

async function checkout(token: string, discountCode?: string, email = "korting@test.local") {
  const option = await shipping();
  return startCheckout(
    token,
    checkoutSchema.parse({
      email,
      firstName: "Test",
      lastName: "Klant",
      street: "Teststraat",
      houseNumber: "1",
      postalCode: "9000",
      city: "Gent",
      country: "BE",
      deliveryOptionId: option.id,
      acceptTerms: true,
      discountCode,
    }),
  );
}

const lastPayment = () => [...created.payments.values()].at(-1)!;

beforeEach(async () => {
  await prisma.shopSettings.deleteMany({ where: { id: 1 } }); // the setup file puts it back afterwards
  if (collectibleId) return;
  const slug = `korting-${randomUUID().slice(0, 8)}`;
  const collectible = await prisma.collectible.create({
    data: { slug, animalCode: "HOND", name: "Kortingstest", priceCents: PRICE, published: true, imageKey: `collectibles/${randomUUID()}.webp` },
  });
  collectibleId = collectible.id;
});

afterAll(async () => {
  const ids = (await orders()).map((order) => order.id);
  const all = await prisma.order.findMany({ where: { items: { some: { collectibleId } } }, select: { id: true } });
  const orderIds = [...new Set([...ids, ...all.map((order) => order.id)])];
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderStatusChange.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.shipment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.cart.deleteMany({ where: { tokenHash: { in: carts.map(hashToken) } } });
  await prisma.discountCode.deleteMany({ where: { code: { in: codes } } });
  await prisma.collectible.delete({ where: { id: collectibleId } });
  await prisma.$disconnect();
});

describe("a discount at checkout", () => {
  it("takes the amount off what is really charged, and is stored on the order", async () => {
    const code = await newCode();
    const cart = await newCart();
    expect(await applyCheckoutDiscount(cart, code)).toEqual({ code, label: "10%", discountCents: 200 });

    await checkout(cart, code);
    const option = await shipping();
    expect(created.amounts.at(-1)).toBe(PRICE - 200 + option.priceCents);
    const order = await prisma.order.findFirstOrThrow({ where: { discountCode: code } });
    expect(order).toMatchObject({ subtotalCents: PRICE, discountCents: 200, totalCents: PRICE - 200 + option.priceCents });
  });

  it("refuses the order rather than quietly charging full price", async () => {
    const code = await newCode({ active: false });
    await expect(checkout(await newCart(), code)).rejects.toMatchObject({ code: "discount_invalid" });
    await expect(checkout(await newCart(), "BESTAAT-NIET")).rejects.toBeInstanceOf(CheckoutError);
  });

  it("gives the last use to exactly one of many checkouts at once", async () => {
    const code = await newCode({ maxRedemptions: 1 });
    const buyers = await Promise.all(Array.from({ length: 5 }, () => newCart()));
    const results = await Promise.allSettled(buyers.map((cart, i) => checkout(cart, code, `race${i}@test.local`)));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.order.count({ where: { discountCode: code } })).toBe(1);
  });

  it("gives a use back when the order closes unpaid", async () => {
    const code = await newCode({ maxRedemptions: 1 });
    await checkout(await newCart(), code);
    await expect(applyCheckoutDiscount(await newCart(), code)).rejects.toMatchObject({ code: "discount_invalid" });

    await processPayment({ ...lastPayment(), status: "CANCELED" }, "webhook");
    await expect(applyCheckoutDiscount(await newCart(), code)).resolves.toMatchObject({ code });
  });

  it("allows once per e-mail address only once for that address", async () => {
    const code = await newCode({ oncePerEmail: true });
    await checkout(await newCart(), code, "eenmalig@test.local");
    await expect(checkout(await newCart(), code, "EENMALIG@test.local")).rejects.toMatchObject({ code: "discount_invalid" });
    await expect(checkout(await newCart(), code, "iemand-anders@test.local")).resolves.toBeTruthy();
  });

  it("can't take off shipping: a 100% code still charges the delivery", async () => {
    const code = await newCode({ value: 100 });
    await checkout(await newCart(), code);
    expect(created.amounts.at(-1)).toBe((await shipping()).priceCents);
  });

  it("pays an order with nothing left to pay without going to Bancontact", async () => {
    const code = await newCode({ value: 100 });
    const option = await shipping();
    await prisma.shopSettings.create({ data: { id: 1, shippingOverrides: { [option.id]: { priceCents: 0, enabled: true } } } });
    const paymentsBefore = created.amounts.length;
    const { checkoutUrl } = await checkout(await newCart(), code);
    expect(created.amounts).toHaveLength(paymentsBefore);
    const url = new URL(checkoutUrl);
    expect(url.pathname).toBe("/checkout/return");
    const status = await getOrderStatusForCustomer(url.searchParams.get("order")!, url.searchParams.get("t"));
    expect(status?.status).toBe("PAID");
  });

  it("takes bought collectibles out of the cart once paid, not before", async () => {
    const cart = await newCart();
    await checkout(cart);
    expect((await getCart(cart))?.lines).toHaveLength(1);
    await processPayment({ ...lastPayment(), status: "PAID" }, "webhook");
    expect((await getCart(cart))?.lines).toHaveLength(0);
  });

  it("keeps a code that was used, for the books", async () => {
    const code = await newCode();
    await checkout(await newCart(), code);
    const { id } = await prisma.discountCode.findUniqueOrThrow({ where: { code } });
    await expect(deleteDiscount(id)).rejects.toBeInstanceOf(DiscountInUseError);
  });
});

describe("delivery without shipping", () => {
  const person = { email: "ophalen@test.local", firstName: "Test", lastName: "Klant", country: "BE", acceptTerms: true };
  const noAddress = (deliveryOptionId: string, discountCode?: string) => checkoutSchema.parse({ ...person, deliveryOptionId, discountCode });
  const lastOrder = (discountCode: string) =>
    prisma.order.findFirstOrThrow({ where: { discountCode }, include: { shipment: true, items: true } });

  it("picks up at the campus for free, without asking for an address", async () => {
    const code = await newCode();
    await startCheckout(await newCart(), noAddress("be-pickup-kantienberg", code));
    const order = await lastOrder(code);
    expect(order).toMatchObject({ shippingCents: 0, street: null, postalCode: null, city: null });
    expect(order.shipment).toMatchObject({ deliveryType: "PICKUP", priceCents: 0, carrier: "Palleys" });
  });

  it("keeps no address that was sent along for a pickup", async () => {
    const code = await newCode();
    const input = checkoutSchema.parse({ ...person, deliveryOptionId: "be-pickup-kantienberg", discountCode: code, street: "Weg", houseNumber: "1", postalCode: "9000", city: "Gent" });
    await startCheckout(await newCart(), input);
    expect(await lastOrder(code)).toMatchObject({ street: null, city: null });
  });

  it("still needs an address for a parcel", async () => {
    await expect(startCheckout(await newCart(), noAddress("be-bpost-home"))).rejects.toMatchObject({ code: "address_required" });
  });

  it("only offers friends and family with a code that allows it", async () => {
    const token = await newCart();
    const ids = async (code?: string) => (await listDeliveryOptions(token, { country: "BE" }, code)).map((option) => option.id);
    expect(await ids()).not.toContain("friends-family");
    expect(await ids("BESTAAT-NIET")).not.toContain("friends-family");
    expect(await ids(await newCode())).not.toContain("friends-family");
    expect(await ids(await newCode({ personalDelivery: true }))).toContain("friends-family");
    expect(await ids(await newCode({ personalDelivery: true, active: false }))).not.toContain("friends-family");
  });

  it("refuses friends and family without such a code, however the request is made", async () => {
    await expect(startCheckout(await newCart(), noAddress("friends-family"))).rejects.toMatchObject({ code: "delivery_option_invalid" });
    await expect(startCheckout(await newCart(), noAddress("friends-family", await newCode()))).rejects.toMatchObject({ code: "delivery_option_invalid" });
  });

  it("hands over for free with a code that gives no discount: they still pay for the product", async () => {
    const code = await newCode({ personalDelivery: true, value: 0 });
    await startCheckout(await newCart(), noAddress("friends-family", code));
    const order = await lastOrder(code);
    expect(order).toMatchObject({ subtotalCents: PRICE, discountCents: 0, shippingCents: 0, totalCents: PRICE, street: null });
    expect(order.shipment).toMatchObject({ deliveryType: "HANDOVER", provider: "manual", priceCents: 0 });
  });

  it("does not take a friends code past its limit", async () => {
    const code = await newCode({ personalDelivery: true, value: 0, maxRedemptions: 1 });
    await startCheckout(await newCart(), noAddress("friends-family", code));
    await expect(startCheckout(await newCart(), noAddress("friends-family", code))).rejects.toMatchObject({ code: "discount_invalid" });
  });

  it("lets the customer choose the attachment of a collectible at checkout", async () => {
    const token = await newCart();
    const lineId = (await getCart(token))!.lines[0].id;
    expect((await getCart(token))!.lines[0].attachment).toBe("clip");
    const updated = await updateCartLineQuantity(token, { lineId, attachment: "key-ring" });
    expect(updated!.lines[0]).toMatchObject({ attachment: "key-ring", quantity: 1 });
    const code = await newCode();
    await startCheckout(token, noAddress("be-pickup-kantienberg", code));
    expect((await lastOrder(code)).items[0]).toMatchObject({ attachment: "key-ring" });
  });
});
