import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/* Deleting and correcting orders from the backoffice, against the local database, with R2 mocked. */

const storage = vi.hoisted(() => ({ deleted: [] as string[] }));

vi.mock("@/core/networking/external/storage-client", () => ({
  deleteObject: async (key: string) => void storage.deleted.push(key),
  objectExists: async () => true,
  createDownloadUrl: async (key: string) => `https://r2.test/${key}`,
}));

const { prisma } = await import("@/db/client");
const { nextOrderNumber } = await import("./service");
const { deleteOrder, updateOrderDetails } = await import("./maintenance");

const ADMIN = "Testadmin";
const orderIds: string[] = [];
const numbers: string[] = [];
const previewIds: string[] = [];

afterAll(async () => {
  await prisma.orderStatusChange.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.shipment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.preview.deleteMany({ where: { id: { in: previewIds } } });
  await prisma.deletedOrder.deleteMany({ where: { number: { in: numbers } } });
  await prisma.$disconnect();
});

beforeEach(() => {
  storage.deleted = [];
});

async function testOrder({
  payment,
  delivery = "HOME",
  status = "PAID",
}: { payment?: { status: "PAID" | "OPEN"; mode: "test" | "live"; provider?: string }; delivery?: "HOME" | "PICKUP"; status?: "PAID" | "SHIPPED" } = {}) {
  const previewId = randomUUID();
  previewIds.push(previewId);
  await prisma.preview.create({
    data: {
      id: previewId,
      status: "PRINT_READY",
      poseImageKey: `previews/${previewId}/pose-1.png`,
      processedKey: `previews/${previewId}/processed-1.zip`,
      photos: { create: [{ key: `previews/${previewId}/photo-1.jpg` }] },
    },
  });
  const order = await prisma.$transaction(async (tx) =>
    tx.order.create({
      data: {
        number: await nextOrderNumber(tx),
        status,
        email: "klant@example.com",
        firstName: "Test",
        lastName: "Klant",
        street: delivery === "HOME" ? "Teststraat" : null,
        houseNumber: delivery === "HOME" ? "1" : null,
        postalCode: delivery === "HOME" ? "9000" : null,
        city: delivery === "HOME" ? "Gent" : null,
        country: "BE",
        subtotalCents: 100,
        shippingCents: 0,
        vatCents: 0,
        totalCents: 100,
        statusTokenHash: "x",
        items: { create: [{ position: 1, previewId, productCode: "P-CLP-KAT", size: "M", edition: "keychain", attachment: "clip", animal: "cat", title: "Palley Kat", unitCents: 100 }] },
        shipment: { create: { provider: "static", deliveryOptionId: "x", deliveryType: delivery, carrier: "bpost", label: delivery, priceCents: 0 } },
        payments: payment
          ? { create: [{ provider: payment.provider ?? "bancontact", providerPaymentId: randomUUID().replaceAll("-", ""), mode: payment.mode, status: payment.status, amountCents: 100 }] }
          : undefined,
      },
      include: { items: true },
    }),
  );
  orderIds.push(order.id);
  numbers.push(order.number);
  return { order, previewId };
}

const confirm = (number: string, extra: Partial<{ confirmPaid: boolean }> = {}) => ({ confirmNumber: number, reason: "Testorder", confirmPaid: false, ...extra });

describe("deleting an order", () => {
  it("refuses unless the number is typed exactly", async () => {
    const { order } = await testOrder();
    await expect(deleteOrder(order.id, confirm(order.number.toLowerCase()), ADMIN)).rejects.toThrow("klopt niet");
    await expect(deleteOrder(order.id, confirm(`${order.number} `.trim() + "0"), ADMIN)).rejects.toThrow("klopt niet");
    expect(await prisma.order.findUnique({ where: { id: order.id } })).not.toBeNull();
  });

  it("waits while a Bancontact payment can still be paid", async () => {
    const { order } = await testOrder({ payment: { status: "OPEN", mode: "live" } });
    await expect(deleteOrder(order.id, confirm(order.number), ADMIN)).rejects.toThrow("loopt nog een Bancontact-betaling");
  });

  it("asks one more confirmation for real money, not for a test payment", async () => {
    const live = await testOrder({ payment: { status: "PAID", mode: "live" } });
    await expect(deleteOrder(live.order.id, confirm(live.order.number), ADMIN)).rejects.toThrow("echt geld");
    await deleteOrder(live.order.id, confirm(live.order.number, { confirmPaid: true }), ADMIN);

    const test = await testOrder({ payment: { status: "PAID", mode: "test" } });
    await expect(deleteOrder(test.order.id, confirm(test.order.number), ADMIN)).resolves.toMatchObject({ number: test.order.number });
  });

  it("removes the order with its payments, delivery and previews, and keeps a note without customer data", async () => {
    const { order, previewId } = await testOrder({ payment: { status: "PAID", mode: "test" } });
    expect(await deleteOrder(order.id, confirm(order.number), ADMIN)).toMatchObject({ number: order.number, previews: 1 });

    expect(await prisma.order.findUnique({ where: { id: order.id } })).toBeNull();
    expect(await prisma.payment.count({ where: { orderId: order.id } })).toBe(0);
    expect(await prisma.shipment.count({ where: { orderId: order.id } })).toBe(0);
    expect(await prisma.preview.findUnique({ where: { id: previewId } })).toBeNull();
    expect(storage.deleted.sort()).toEqual(
      [`previews/${previewId}/photo-1.jpg`, `previews/${previewId}/pose-1.png`, `previews/${previewId}/processed-1.zip`].sort(),
    );

    const note = await prisma.deletedOrder.findFirstOrThrow({ where: { number: order.number } });
    expect(note).toMatchObject({ orderId: order.id, reason: "Testorder", deletedBy: ADMIN, totalCents: 100, paymentSummary: "bancontact test PAID 100" });
    expect(JSON.stringify(note)).not.toContain("klant@example.com");
    expect(JSON.stringify(note)).not.toContain("Teststraat");

    // The number is never handed out again.
    const { order: next } = await testOrder();
    expect(next.number).not.toBe(order.number);
  });
});

describe("correcting an order", () => {
  const details = (overrides: Record<string, unknown> = {}) => ({
    firstName: "Test",
    lastName: "Klant",
    email: "klant@example.com",
    phone: null,
    address: { street: "Teststraat", houseNumber: "1", postalCode: "9000", city: "Gent" },
    trackingCode: null,
    itemNotes: {},
    ...overrides,
  });

  it("changes what was corrected and logs which fields, not their values", async () => {
    const { order } = await testOrder();
    const result = await updateOrderDetails(
      order.id,
      details({ email: "nieuw@example.com", address: { street: "Kerkstraat", houseNumber: "12 bus 3", postalCode: "9050", city: "Gentbrugge" }, itemNotes: { [order.items[0].id]: "Groene ogen" } }),
      ADMIN,
    );
    expect(result.changed).toEqual(["e-mail", "straat", "huisnummer", "postcode", "gemeente", "opmerking bij een lijn"]);
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true, statusChanges: true } });
    expect(after).toMatchObject({ email: "nieuw@example.com", street: "Kerkstraat", houseNumber: "12 bus 3", postalCode: "9050", city: "Gentbrugge" });
    expect(after.items[0].notes).toBe("Groene ogen");
    const log = after.statusChanges.find((change) => change.note?.startsWith("Gegevens aangepast"))!;
    expect(log.note).not.toContain("Kerkstraat");
    expect(log.note).not.toContain("nieuw@example.com");

    expect(await updateOrderDetails(order.id, details({ email: "nieuw@example.com", address: { street: "Kerkstraat", houseNumber: "12 bus 3", postalCode: "9050", city: "Gentbrugge" }, itemNotes: { [order.items[0].id]: "Groene ogen" } }), ADMIN)).toEqual({ orderId: order.id, changed: [] });
  });

  it("keeps the address rules of the delivery", async () => {
    const pickup = await testOrder({ delivery: "PICKUP" });
    await expect(updateOrderDetails(pickup.order.id, details(), ADMIN)).rejects.toThrow("geen adres");
    await expect(updateOrderDetails(pickup.order.id, details({ address: null, phone: "0476 12 34 56" }), ADMIN)).resolves.toMatchObject({ changed: ["telefoon"] });

    const home = await testOrder();
    await expect(updateOrderDetails(home.order.id, details({ address: null }), ADMIN)).rejects.toThrow("volledig adres");
    await expect(updateOrderDetails(home.order.id, details({ itemNotes: { [randomUUID()]: "x" } }), ADMIN)).rejects.toThrow("hoort niet bij");

    const shipped = await testOrder({ status: "SHIPPED" });
    await expect(
      updateOrderDetails(shipped.order.id, details({ address: { street: "Elders", houseNumber: "1", postalCode: "9000", city: "Gent" } }), ADMIN),
    ).rejects.toThrow("al verzonden");
    await expect(updateOrderDetails(shipped.order.id, details({ trackingCode: "3SABC123" }), ADMIN)).resolves.toMatchObject({ changed: ["trackingcode"] });
  });
});
