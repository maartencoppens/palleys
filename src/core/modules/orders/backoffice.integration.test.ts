import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderPayment } from "@/core/modules/payments/providers/types";

/*
 * The backoffice over our own code, against the local database, with Bancontact, R2 and Resend mocked: collectibles from
 * the shop's cart to a paid order, orders added by hand, and the check-in that gets an order out of the door.
 */

const bancontact = vi.hoisted(() => ({ payments: new Map<string, ProviderPayment>(), configured: true }));

vi.mock("@/core/modules/payments/providers", () => ({
  paymentProvider: {
    name: "bancontact",
    isConfigured: () => bancontact.configured,
    mode: () => "test",
    isCheckoutUrl: (url: string) => url.startsWith("https://pay.bancontact.net/"),
    isPaymentId: (id: string) => /^[A-Za-z0-9]{16,40}$/.test(id),
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
        checkoutUrl: `https://pay.bancontact.net/?checkoutApi=${id}`,
        snapshot: { id },
      };
      bancontact.payments.set(id, payment);
      return payment;
    },
    async getPayment(id: string) {
      const payment = bancontact.payments.get(id);
      if (!payment) throw new Error("not found");
      return payment;
    },
  },
}));

// R2 as a map: what a test puts there can be read back, and a key in `missing` was never uploaded.
const storage = vi.hoisted(() => ({ objects: new Map<string, Buffer>(), missing: new Set<string>() }));

vi.mock("@/core/networking/external/storage-client", () => ({
  objectExists: async (key: string) => !storage.missing.has(key),
  createDownloadUrl: async (key: string, name?: string) => `https://r2.test/${key}${name ? `?name=${name}` : ""}`,
  createUploadUrl: async (key: string) => `https://r2.test/upload/${key}`,
  putObject: async (key: string, body: Buffer) => void storage.objects.set(key, body),
  deleteObject: async (key: string) => void storage.objects.delete(key),
  getObject: async (key: string) => storage.objects.get(key) ?? Buffer.from(""),
}));

const mail = vi.hoisted(() => ({ sent: [] as { to: string; text: string }[] }));

vi.mock("@/core/networking/external/email-client", () => ({
  isEmailConfigured: () => true,
  sendEmail: async (message: { to: string; text: string }) => {
    mail.sent.push(message);
    return true;
  },
}));

const { default: sharp } = await import("sharp");
const { prisma } = await import("@/db/client");
const { addCollectibleToCart, getCart } = await import("@/core/modules/cart/service");
const { startCheckout } = await import("@/core/modules/checkout/service");
const { checkoutSchema } = await import("@/core/modules/checkout/types");
const {
  archiveCollectible,
  CollectibleFromPreviewError,
  CollectibleModelMissingError,
  createCollectible,
  attachPreviewModel,
  startCollectibleGeneration,
  createModelUpload,
  getCollectibleModelDownload,
  getCollectibleForAdmin,
  InvalidCollectibleImageError,
  listPublishedCollectibles,
  restoreCollectible,
  storeCollectibleImage,
  updateCollectible,
} = await import("@/core/modules/collectibles/service");
const { collectibleInputSchema } = await import("@/core/modules/collectibles/types");
const { createManualOrder, setItemCheckIn, updateOrderStatus } = await import("./admin");
const { getOrderForAdmin, listOrdersForCheckIn } = await import("./service");
const { confirmProcessedUpload, getCollectiblePrintQueue } = await import("@/core/modules/print-prep/service");
const { approvePreview, setPromptOverride, uploadPose } = await import("@/core/modules/previews/service");
const { updateSettingsSection, getShopSettings } = await import("@/core/modules/settings/service");
const { DEFAULT_ANIMALS } = await import("@/data/animals");
const { manualOrderSchema } = await import("./types");
const { expireStaleOrders, handlePaymentWebhook, createManualOrderPaymentLink, recordManualPayment, ManualPaymentNotAllowedError } = await import(
  "@/core/modules/payments/service"
);

const ADMIN = "Test Admin";
const IMAGE_KEY = "collectibles/3f2a9c1e-1234-4abc-9def-0123456789ab.webp";

const createdCollectibles: string[] = [];
const createdOrders = new Set<string>();

async function newCollectible(overrides: Partial<Parameters<typeof collectibleInputSchema.parse>[0] & object> = {}) {
  const name = `Testmodel ${randomUUID().slice(0, 8)}`;
  const input = collectibleInputSchema.parse({
    name,
    translations: { en: { name: `Test model ${name.slice(-8)}` } },
    priceCents: 1995,
    imageKey: IMAGE_KEY,
    published: true,
    soldOut: false,
    sortOrder: 0,
    ...overrides,
  });
  const { id } = await createCollectible(input, ADMIN);
  createdCollectibles.push(id);
  return { id, input };
}

const friend = { firstName: "Vriend", lastName: "Testmans" };

function manualOrder(overrides: object = {}) {
  return manualOrderSchema.parse({
    customer: friend,
    lines: [{ kind: "personalized", animal: "dog", edition: "keychain", quantity: 1 }],
    delivery: { type: "handover" },
    payment: { type: "later" },
    sendConfirmation: false,
    ...overrides,
  });
}

async function addOrder(overrides: object = {}) {
  const result = await createManualOrder(manualOrder(overrides), ADMIN);
  createdOrders.add(result.orderId);
  return result;
}

const loadOrder = (id: string) =>
  prisma.order.findUniqueOrThrow({
    where: { id },
    include: { items: { include: { preview: true } }, payments: true, shipment: true, statusChanges: true },
  });

beforeEach(async () => {
  bancontact.configured = true;
  mail.sent.length = 0;
  await prisma.shopSettings.deleteMany({ where: { id: 1 } });
});

afterAll(async () => {
  const ids = [...createdOrders];
  const items = await prisma.orderItem.findMany({ where: { orderId: { in: ids } }, select: { previewId: true } });
  await prisma.orderStatusChange.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.shipment.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.order.deleteMany({ where: { id: { in: ids } } });
  await prisma.preview.deleteMany({ where: { id: { in: items.flatMap((item) => item.previewId ?? []) } } });
  await prisma.cart.deleteMany({ where: { lines: { some: { collectibleId: { in: createdCollectibles } } } } });
  const generated = await prisma.collectible.findMany({ where: { id: { in: createdCollectibles } }, select: { sourcePreviewId: true } });
  await prisma.collectible.deleteMany({ where: { id: { in: createdCollectibles } } });
  await prisma.preview.deleteMany({ where: { id: { in: generated.flatMap((row) => row.sourcePreviewId ?? []) } } });
  await prisma.shopSettings.deleteMany({ where: { id: 1 } });
  await prisma.$disconnect();
});

describe("collectibles", () => {
  it("needs a photo before it can go on the website", () => {
    const input = { name: "Zonder foto", priceCents: 1000, imageKey: null, soldOut: false, sortOrder: 0 };
    expect(collectibleInputSchema.safeParse({ ...input, published: true }).success).toBe(false);
    expect(collectibleInputSchema.safeParse({ ...input, published: false }).success).toBe(true);
  });

  it("gets a unique address, also for the same name", async () => {
    const name = `Dubbel ${randomUUID().slice(0, 8)}`;
    const first = await newCollectible({ name });
    const second = await newCollectible({ name });
    const rows = await prisma.collectible.findMany({ where: { id: { in: [first.id, second.id] } }, orderBy: { createdAt: "asc" } });
    expect(rows[1].slug).toBe(`${rows[0].slug}-2`);
    expect(rows[1].sku).not.toBe(rows[0].sku);
  });

  it("disappears from the shop and from carts when removed, and can come back", async () => {
    const { id, input } = await newCollectible();
    const { token, cart } = await addCollectibleToCart(null, { collectibleId: id });
    expect(cart.lines).toHaveLength(1);
    expect((await listPublishedCollectibles("nl")).some((row) => row.id === id)).toBe(true);

    await archiveCollectible(id, ADMIN);
    expect((await listPublishedCollectibles("nl")).some((row) => row.id === id)).toBe(false);
    expect((await getCart(token))?.lines).toHaveLength(0);
    await expect(addCollectibleToCart(null, { collectibleId: id })).rejects.toMatchObject({ code: "collectible_unavailable" });

    await restoreCollectible(id, ADMIN);
    expect((await listPublishedCollectibles("nl")).some((row) => row.id === id)).toBe(false); // hidden until published again
    await updateCollectible(id, input, ADMIN);
    expect((await listPublishedCollectibles("nl")).some((row) => row.id === id)).toBe(true);
  });

  it("shows its English texts on the English shop, and needs them before it goes on the website", async () => {
    const { id } = await newCollectible({
      description: "Een zwarte kat",
      translations: { en: { name: "Black cat", description: "A black cat" } },
    });
    const english = (await listPublishedCollectibles("en")).find((row) => row.id === id);
    expect(english).toMatchObject({ name: "Black cat", description: "A black cat" });
    expect((await listPublishedCollectibles("nl")).find((row) => row.id === id)?.description).toBe("Een zwarte kat");
    const { cart } = await addCollectibleToCart(null, { collectibleId: id });
    expect(cart.lines[0].productTitles.en).toBe("Black cat");

    const untranslated = { name: "Hond", description: "Een hond", priceCents: 1995, imageKey: IMAGE_KEY, soldOut: false, sortOrder: 0 };
    const missing = { ...untranslated, translations: { en: { name: "Dog" } } };
    expect(collectibleInputSchema.safeParse({ ...missing, published: true }).success).toBe(false);
    expect(collectibleInputSchema.safeParse({ ...missing, published: false }).success).toBe(true);
  });

  it("can't be bought when sold out, but stays visible", async () => {
    const { id } = await newCollectible({ soldOut: true });
    await expect(addCollectibleToCart(null, { collectibleId: id })).rejects.toMatchObject({ code: "collectible_unavailable" });
    expect((await listPublishedCollectibles("nl")).some((row) => row.id === id)).toBe(true);
  });

  it("goes through the checkout without a preview, with a right of withdrawal", async () => {
    const { id, input } = await newCollectible();
    await addCollectibleToCart(null, { collectibleId: id });
    const { token } = await addCollectibleToCart(null, { collectibleId: id });
    const { cart } = await addCollectibleToCart(token, { collectibleId: id });
    expect(cart.lines[0]).toMatchObject({ kind: "collectible", quantity: 2, withdrawable: true, animal: null });

    const { checkoutUrl } = await startCheckout(
      token,
      checkoutSchema.parse({
        email: "koper@example.com",
        firstName: "Koper",
        lastName: "Test",
        street: "Teststraat",
        houseNumber: "1",
        postalCode: "9000",
        city: "Gent",
        country: "BE",
        deliveryOptionId: "be-bpost-home",
        acceptTerms: true,
      }),
    );
    const payment = await prisma.payment.findFirstOrThrow({ where: { checkoutUrl } });
    createdOrders.add(payment.orderId);

    bancontact.payments.set(payment.providerPaymentId, { ...bancontact.payments.get(payment.providerPaymentId)!, status: "PAID" });
    expect(await handlePaymentWebhook(payment.providerPaymentId)).toMatchObject({ outcome: "processed", orderStatus: "PAID" });

    const order = await loadOrder(payment.orderId);
    expect(order.attentionReason).toBeNull();
    expect(order.subtotalCents).toBe(2 * input.priceCents);
    expect(order.items[0]).toMatchObject({ collectibleId: id, previewId: null, withdrawable: true, quantity: 2 });
    expect(mail.sent[0].text).toContain("14 dagen");
    expect(mail.sent[0].text).not.toContain("herroepingsrecht niet");
  });
});

describe("collectible images", () => {
  it("converts an upload to a WebP under a name of our own", async () => {
    const png = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: "#075847" } }).png().toBuffer();
    const stored = await storeCollectibleImage(png);
    expect(stored.imageKey).toMatch(/^collectibles\/[0-9a-f-]{36}\.webp$/);
    expect(stored.imageUrl).toMatch(/^\/api\/collectibles\/images\/[0-9a-f-]{36}\.webp$/);
    expect(collectibleInputSchema.safeParse({ name: "x", priceCents: 1000, imageKey: stored.imageKey, published: true, soldOut: false, sortOrder: 0, translations: { en: { name: "x" } } }).success).toBe(true);
  });

  it("refuses a file that isn't an image", async () => {
    await expect(storeCollectibleImage(Buffer.from("geen foto"))).rejects.toBeInstanceOf(InvalidCollectibleImageError);
  });

  it("only counts sold copies from paid orders", async () => {
    const { id } = await newCollectible();
    await addOrder({ lines: [{ kind: "collectible", collectibleId: id, quantity: 3 }] });
    expect((await getCollectibleForAdmin(id))?.orderedQuantity).toBe(0);
    await addOrder({ lines: [{ kind: "collectible", collectibleId: id, quantity: 2 }], payment: { type: "paid", method: "cash" } });
    expect((await getCollectibleForAdmin(id))?.orderedQuantity).toBe(2);
  });
});

describe("the order page", () => {
  it("shows a handed-over order with a collectible, without address or terms", async () => {
    const { id } = await newCollectible();
    const { orderId } = await addOrder({
      lines: [
        { kind: "personalized", animal: "dog", edition: "keychain", quantity: 1 },
        { kind: "collectible", collectibleId: id, quantity: 1 },
      ],
    });
    const order = await getOrderForAdmin(orderId);
    expect(order).toMatchObject({ createdBy: ADMIN, email: null, address: null, termsAcceptedAt: null });
    expect(order?.shipment?.deliveryType).toBe("HANDOVER");
    const palley = order?.items.find((item) => item.kind === "personalized");
    const collectible = order?.items.find((item) => item.kind === "collectible");
    expect(palley).toMatchObject({ previewStatus: "UPLOADED", photoUrl: null });
    expect(collectible).toMatchObject({ previewId: null, previewStatus: null });
    expect(collectible?.photoUrl).toMatch(/^\/api\/collectibles\/images\//);
  });

  it("offers the open payment link, and only that", async () => {
    const { orderId } = await addOrder({ payment: { type: "bancontact" } });
    const order = await getOrderForAdmin(orderId);
    expect(order?.payments[0].checkoutUrl).toMatch(/^https:\/\/pay\.bancontact\.net\//);
    await prisma.payment.updateMany({ where: { orderId }, data: { status: "EXPIRED" } });
    expect((await getOrderForAdmin(orderId))?.payments[0].checkoutUrl).toBeNull();
  });
});

describe("live prices", () => {
  it("uses the price an admin set, on new orders only", async () => {
    const before = await addOrder();
    await prisma.shopSettings.create({
      data: { id: 1, catalog: { prices: { keychain: 3500, figurine: 2000 }, disabledAnimals: [], disabledEditions: [] } },
    });
    const after = await addOrder();
    expect((await loadOrder(before.orderId)).subtotalCents).toBe(2799);
    expect((await loadOrder(after.orderId)).subtotalCents).toBe(3500);
  });

  it("falls back to the starting prices when the stored settings are broken", async () => {
    await prisma.shopSettings.create({ data: { id: 1, catalog: { prices: "kapot" } } });
    const { orderId } = await addOrder();
    expect((await loadOrder(orderId)).subtotalCents).toBe(2799);
  });
});

describe("adding an order by hand", () => {
  it("needs no e-mail, address or accepted terms for a friend who gets it handed over", async () => {
    const { orderId, number, previews } = await addOrder();
    const order = await loadOrder(orderId);

    expect(number).toMatch(/^PAL-\d{4}-\d{5}$/);
    expect(order).toMatchObject({
      status: "PENDING_PAYMENT",
      createdBy: ADMIN,
      email: null,
      street: null,
      termsVersion: null,
      termsAcceptedAt: null,
      shippingCents: 0,
    });
    expect(order.shipment).toMatchObject({ deliveryType: "HANDOVER", priceCents: 0 });
    expect(previews).toHaveLength(1);
    expect(order.items[0].preview).toMatchObject({ status: "UPLOADED", expiresAt: null });
    expect(order.statusChanges[0].source).toBe(`admin:${ADMIN}`);
  });

  it("takes an adjusted price", async () => {
    const { orderId } = await addOrder({
      lines: [{ kind: "personalized", animal: "cat", edition: "figure", quantity: 2, unitCents: 1000 }],
      delivery: {
        type: "ship",
        optionId: "be-bpost-home",
        priceCents: 0,
        street: "Vriendenstraat",
        houseNumber: "2",
        postalCode: "9000",
        city: "Gent",
      },
    });
    expect(await loadOrder(orderId)).toMatchObject({
      subtotalCents: 2000,
      shippingCents: 0,
      totalCents: 2000,
      vatCents: 0,
      street: "Vriendenstraat",
    });
  });

  it("refuses a Bancontact order until Bancontact Pro is connected, and a free one", async () => {
    bancontact.configured = false;
    await expect(createManualOrder(manualOrder({ payment: { type: "bancontact" } }), ADMIN)).rejects.toThrow("nog niet gekoppeld");

    bancontact.configured = true;
    const free = manualOrder({
      payment: { type: "bancontact" },
      lines: [{ kind: "personalized", animal: "cat", edition: "figure", quantity: 1, unitCents: 0 }],
    });
    await expect(createManualOrder(free, ADMIN)).rejects.toThrow("gratis");
  });

  it("marks a paid order paid right away: previews go to review", async () => {
    const { orderId, previews } = await addOrder({
      customer: { ...friend, email: "Vriend@Example.com" },
      payment: { type: "paid", method: "cash" },
      sendConfirmation: true,
    });
    const order = await loadOrder(orderId);
    expect(order.status).toBe("PAID");
    expect(order.email).toBe("vriend@example.com");
    expect(order.payments[0]).toMatchObject({ provider: "manual", method: "cash", status: "PAID", amountCents: order.totalCents });
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].text).toContain("Op je bestelling gelden");

    const preview = await prisma.preview.findUniqueOrThrow({ where: { id: previews[0].previewId } });
    expect(preview).toMatchObject({ status: "PAID", orderNumber: order.number, animalType: "HOND" });
  });

  it("sends no mail when asked not to, or when there's no address", async () => {
    await addOrder({ customer: { ...friend, email: "vriend@example.com" }, payment: { type: "paid", method: "cash" }, sendConfirmation: false });
    await addOrder({ payment: { type: "paid", method: "gift" }, sendConfirmation: true });
    expect(mail.sent).toHaveLength(0);
  });

  it("pays through a Bancontact link, and the order stays open when a link lapses", async () => {
    const { orderId, paymentLinkFailed } = await addOrder({ payment: { type: "bancontact" } });
    expect(paymentLinkFailed).toBe(false);
    const first = (await loadOrder(orderId)).payments[0];
    expect(first.checkoutUrl).toMatch(/^https:\/\/pay\.bancontact\.net\//);

    bancontact.payments.set(first.providerPaymentId, { ...bancontact.payments.get(first.providerPaymentId)!, status: "EXPIRED" });
    await handlePaymentWebhook(first.providerPaymentId);
    expect((await loadOrder(orderId)).status).toBe("PENDING_PAYMENT");

    const link = await createManualOrderPaymentLink(orderId);
    const second = (await loadOrder(orderId)).payments.find((payment) => payment.checkoutUrl === link?.checkoutUrl)!;
    bancontact.payments.set(second.providerPaymentId, { ...bancontact.payments.get(second.providerPaymentId)!, status: "PAID" });
    await handlePaymentWebhook(second.providerPaymentId);
    expect((await loadOrder(orderId)).status).toBe("PAID");
  });

  it("isn't closed by the cron, unlike a website order", async () => {
    const { orderId } = await addOrder();
    await prisma.order.update({ where: { id: orderId }, data: { createdAt: new Date(Date.now() - 3 * 86_400_000) } });
    await expireStaleOrders();
    expect((await loadOrder(orderId)).status).toBe("PENDING_PAYMENT");
  });

  it("never lets a website order be marked paid by hand", async () => {
    const { orderId } = await addOrder();
    await prisma.order.update({ where: { id: orderId }, data: { createdBy: null } });
    await expect(recordManualPayment(orderId, "cash", ADMIN, { sendConfirmation: false })).rejects.toBeInstanceOf(ManualPaymentNotAllowedError);
    await expect(createManualOrderPaymentLink(orderId)).rejects.toBeInstanceOf(ManualPaymentNotAllowedError);
  });
});

describe("check-in per order", () => {
  it("waits for the pipeline, then needs every item ticked off before it leaves", async () => {
    const { id } = await newCollectible();
    const { orderId, previews } = await addOrder({
      lines: [
        { kind: "personalized", animal: "dog", edition: "keychain", quantity: 1 },
        { kind: "collectible", collectibleId: id, quantity: 1 },
      ],
      payment: { type: "paid", method: "cash" },
    });
    const items = (await loadOrder(orderId)).items;
    const palley = items.find((item) => item.previewId)!;
    const collectible = items.find((item) => item.collectibleId)!;

    // The collectible skips the pipeline; the Palley isn't print-ready yet.
    await setItemCheckIn(orderId, collectible.id, true, ADMIN);
    await expect(setItemCheckIn(orderId, palley.id, true, ADMIN)).rejects.toThrow("nog niet klaar");
    await expect(updateOrderStatus(orderId, { status: "SHIPPED" }, ADMIN)).rejects.toThrow("Vink eerst");

    const row = (await listOrdersForCheckIn()).find((order) => order.id === orderId)!;
    expect(row.summary).toEqual({ total: 2, checked: 1, ready: 0, inPipeline: 1 });
    expect(row.nextStep).toBe("1 model nog in de pipeline");

    await prisma.preview.update({ where: { id: previews[0].previewId }, data: { status: "PRINT_READY" } });
    await setItemCheckIn(orderId, palley.id, true, ADMIN);
    expect((await listOrdersForCheckIn()).find((order) => order.id === orderId)?.nextStep).toBe("Klaar om te overhandigen");

    await updateOrderStatus(orderId, { status: "IN_PRODUCTION" }, ADMIN);
    await updateOrderStatus(orderId, { status: "SHIPPED", trackingCode: "BE123" }, ADMIN);

    const shipped = await loadOrder(orderId);
    expect(shipped.status).toBe("SHIPPED");
    expect(shipped.shipment).toMatchObject({ trackingCode: "BE123" });
    expect(shipped.shipment?.shippedAt).not.toBeNull();
    expect(shipped.items.find((item) => item.id === palley.id)).toMatchObject({ checkedInBy: ADMIN });
    expect((await listOrdersForCheckIn()).some((order) => order.id === orderId)).toBe(false);

    await expect(setItemCheckIn(orderId, palley.id, false, ADMIN)).rejects.toThrow("Items afvinken");
  });

  it("can cancel an unpaid order, and refund only money we recorded ourselves", async () => {
    const unpaid = await addOrder();
    await expect(updateOrderStatus(unpaid.orderId, { status: "REFUNDED" }, ADMIN)).rejects.toThrow("Bancontact Pro-portaal");
    await updateOrderStatus(unpaid.orderId, { status: "CANCELLED" }, ADMIN);
    expect((await loadOrder(unpaid.orderId)).status).toBe("CANCELLED");

    const paid = await addOrder({ payment: { type: "paid", method: "transfer" } });
    await expect(updateOrderStatus(paid.orderId, { status: "CANCELLED" }, ADMIN)).rejects.toThrow("huidige status");
    await updateOrderStatus(paid.orderId, { status: "REFUNDED" }, ADMIN);
    expect((await loadOrder(paid.orderId)).status).toBe("REFUNDED");
  });
});

describe("collectible 3D models", () => {
  it("keeps one uploaded model per collectible, and refuses a model that never arrived", async () => {
    const { key } = await createModelUpload();
    expect(key).toMatch(/^collectibles\/models\/[0-9a-f-]{36}\.zip$/);
    storage.missing.add(key);
    await expect(newCollectible({ modelKey: key, modelFileName: "hond.zip" })).rejects.toBeInstanceOf(CollectibleModelMissingError);

    storage.missing.delete(key);
    const { id } = await newCollectible({ modelKey: key, modelFileName: "Golden Retriever.zip" });
    expect(await getCollectibleForAdmin(id)).toMatchObject({ modelKey: key, modelFileName: "Golden Retriever.zip" });
    const download = await getCollectibleModelDownload(id);
    expect(download.fileName).toBe("Golden Retriever.zip");
    expect(download.url).toContain(key);
    expect(collectibleInputSchema.safeParse({ ...(await newCollectible()).input, modelKey: "previews/x/processed-1.zip" }).success).toBe(false);
  });

  it("puts a paid collectible on the print list with its own model, without a preview", async () => {
    const { key } = await createModelUpload();
    const { id } = await newCollectible({ modelKey: key });
    const { orderId } = await addOrder({
      lines: [{ kind: "collectible", collectibleId: id, attachment: "key-ring", quantity: 2 }],
      payment: { type: "paid", method: "cash" },
    });
    const order = await loadOrder(orderId);
    expect(order.items[0]).toMatchObject({ previewId: null, collectibleId: id });
    expect((await getOrderForAdmin(orderId))?.items[0].collectibleHasModel).toBe(true);
    expect((await getCollectiblePrintQueue()).find((item) => item.orderId === orderId)).toMatchObject({
      collectibleId: id,
      quantity: 2,
      attachment: "key-ring",
      hasModel: true,
    });

    await setItemCheckIn(orderId, order.items[0].id, true, ADMIN);
    expect((await getCollectiblePrintQueue()).some((item) => item.orderId === orderId)).toBe(false);
  });

  it("generates a new collectible apart from any order, with its own prompt, and puts the model on it by itself", async () => {
    const { previewId, collectibleId } = await startCollectibleGeneration({ animalType: "KONIJN", prompt: "Een konijn, zonder staart." }, ADMIN);
    createdCollectibles.push(collectibleId);
    const preview = await prisma.preview.findUniqueOrThrow({ where: { id: previewId }, include: { orderItems: true } });
    expect(preview).toMatchObject({ forCollectible: true, status: "PAID", animalType: "KONIJN", promptOverride: "Een konijn, zonder staart." });
    expect(preview.orderItems).toHaveLength(0);
    expect(await getCollectibleForAdmin(collectibleId)).toMatchObject({
      name: "Nieuwe collectible: Konijn",
      published: false,
      sourcePreviewId: previewId,
      modelKey: null,
    });

    await setPromptOverride(previewId, "Een konijn met hangoren.");
    expect((await prisma.preview.findUniqueOrThrow({ where: { id: previewId } })).promptOverride).toBe("Een konijn met hangoren.");
    await expect(attachPreviewModel(previewId, ADMIN)).rejects.toBeInstanceOf(CollectibleFromPreviewError);

    // Through the pipeline (pose, model, approval are tested elsewhere), up to the Blender zip on Processed.
    const pose = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#ffffff" } }).png().toBuffer();
    storage.objects.set(`previews/${previewId}/pose.png`, pose);
    await prisma.preview.update({ where: { id: previewId }, data: { status: "APPROVED", poseImageKey: `previews/${previewId}/pose.png` } });
    const zip = `previews/${previewId}/processed-${randomUUID()}.zip`;
    storage.objects.set(zip, Buffer.from("zip"));
    await confirmProcessedUpload(previewId, zip, ADMIN);

    const collectible = await getCollectibleForAdmin(collectibleId);
    expect(collectible?.modelKey).toMatch(/^collectibles\/models\//);
    expect(storage.objects.get(collectible!.modelKey!)?.toString()).toBe("zip");
    expect(collectible?.imageKey).toMatch(/^collectibles\/[0-9a-f-]{36}\.webp$/);

    // A better zip later replaces the model, the photo stays.
    const better = `previews/${previewId}/processed-${randomUUID()}.zip`;
    storage.objects.set(better, Buffer.from("zip v2"));
    await confirmProcessedUpload(previewId, better, ADMIN);
    const replaced = await getCollectibleForAdmin(collectibleId);
    expect(storage.objects.get(replaced!.modelKey!)?.toString()).toBe("zip v2");
    expect(storage.objects.has(collectible!.modelKey!)).toBe(false);
    expect(replaced?.imageKey).toBe(collectible?.imageKey);

    const customer = await addOrder();
    await expect(setPromptOverride(customer.previews[0].previewId, "x")).rejects.toThrow("nieuwe collectible");
    await expect(attachPreviewModel(customer.previews[0].previewId, ADMIN)).rejects.toThrow("voor een klant");
  });

  it("starts from a pose made elsewhere, with the general prompt, straight to the 3D model", async () => {
    const { previewId, collectibleId } = await startCollectibleGeneration({ animalType: null, prompt: "A lion, lying down." }, ADMIN);
    createdCollectibles.push(collectibleId);
    expect((await getCollectibleForAdmin(collectibleId))?.name).toBe("Nieuwe collectible");

    const pose = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#ffffff" } }).jpeg().toBuffer();
    await uploadPose(previewId, pose);
    const preview = await prisma.preview.findUniqueOrThrow({ where: { id: previewId } });
    expect(preview).toMatchObject({ status: "POSE_READY", animalType: null });
    expect(preview.poseImageKey).toMatch(/\.png$/);

    // A collectible needn't be one of the shop's animals to be approved.
    await prisma.preview.update({ where: { id: previewId }, data: { status: "MODEL_READY" } });
    await approvePreview(previewId);
    expect((await prisma.preview.findUniqueOrThrow({ where: { id: previewId } })).status).toBe("APPROVED");
    await expect(uploadPose(previewId, pose)).rejects.toThrow("goedgekeurd");

    const customer = await addOrder();
    await expect(uploadPose(customer.previews[0].previewId, pose)).rejects.toThrow("nieuwe collectible");
  });
});

describe("animals managed in the backoffice", () => {
  const parrot = { value: "papegaai", code: "PAPEGAAI", labels: { nl: "Papegaai", en: "Parrot" } };

  it("sells an added animal under its own SKU, and refuses one that was removed", async () => {
    const { catalog } = await getShopSettings();
    await updateSettingsSection("catalog", { ...catalog, animals: [...DEFAULT_ANIMALS, parrot] }, ADMIN);
    const { orderId } = await addOrder({ lines: [{ kind: "personalized", animal: "papegaai", edition: "keychain", quantity: 1 }] });
    expect((await loadOrder(orderId)).items[0]).toMatchObject({ sku: "PAL-GP-KEY-PAPEGAAI", title: "Palley Papegaai · Met sleutelhanger" });
    await expect(startCollectibleGeneration({ animalType: "DINO", prompt: "x" }, ADMIN)).rejects.toThrow("niet in de lijst");

    await updateSettingsSection("catalog", { ...catalog, animals: DEFAULT_ANIMALS.filter((animal) => animal.value !== "snake") }, ADMIN);
    await expect(addOrder({ lines: [{ kind: "personalized", animal: "snake", edition: "keychain", quantity: 1 }] })).rejects.toThrow(
      "niet meer in de lijst",
    );
  });

  it("prefills the preview's animal code from the live list when the order is paid", async () => {
    const { catalog } = await getShopSettings();
    await updateSettingsSection("catalog", { ...catalog, animals: [...DEFAULT_ANIMALS, parrot] }, ADMIN);
    const { previews } = await addOrder({
      lines: [{ kind: "personalized", animal: "papegaai", edition: "figure", quantity: 1 }],
      payment: { type: "paid", method: "cash" },
    });
    expect((await prisma.preview.findUniqueOrThrow({ where: { id: previews[0].previewId } })).animalType).toBe("PAPEGAAI");
  });
});
