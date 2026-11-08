import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/db/client";
import { backfillNaming } from "./naming";

// Runs against the local database, limited to the orders this test makes.

const orderIds: string[] = [];
const collectibleIds: string[] = [];
const previewIds: string[] = [];

afterAll(async () => {
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.collectible.deleteMany({ where: { id: { in: collectibleIds } } });
  await prisma.preview.deleteMany({ where: { id: { in: previewIds } } });
  await prisma.$disconnect();
});

async function legacyOrder() {
  const collectible = await prisma.collectible.create({
    data: { slug: `backfill-${randomUUID().slice(0, 8)}`, name: "Backfilltest", priceCents: 1000, animalCode: "HOND" },
  });
  collectibleIds.push(collectible.id);
  const [dog, cat] = [randomUUID(), randomUUID()];
  await prisma.preview.createMany({ data: [{ id: dog }, { id: cat }] });
  previewIds.push(dog, cat);
  const order = await prisma.order.create({
    data: {
      number: `PAL-1999-${String(Math.floor(Math.random() * 90_000) + 10_000)}`,
      createdAt: new Date("1999-01-01T00:00:00Z"),
      firstName: "Test",
      lastName: "Backfill",
      country: "BE",
      subtotalCents: 0,
      shippingCents: 0,
      vatCents: 0,
      totalCents: 0,
      statusTokenHash: "x",
      items: {
        create: [
          { position: 1, previewId: dog, productCode: "PAL-GP-KEY-HOND", size: "M", edition: "keychain", animal: "dog", title: "Palley Hond", unitCents: 0 },
          { position: 2, productCode: "PAL-COL-BACKFILL", size: "M", collectibleId: collectible.id, title: "Backfilltest", unitCents: 0 },
          { position: 3, previewId: cat, productCode: "PAL-GP-FIG-KAT", size: "M", edition: "figure", animal: "cat", title: "Palley Kat", unitCents: 0 },
        ],
      },
    },
  });
  orderIds.push(order.id);
  return { order, collectible };
}

const run = () => prisma.$transaction((tx) => backfillNaming(tx, { renumberOrders: true, orderIds }));

describe("naming backfill", () => {
  it("renumbers old orders and recomputes product codes, and changes nothing the second time", async () => {
    const { order, collectible } = await legacyOrder();

    const first = await run();
    expect(first.renumbered).toEqual([{ from: order.number, to: expect.stringMatching(/^PLY\d{4,}$/) }]);
    expect(first.attachments).toBe(2);
    expect(first.productCodes).toBe(3);

    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: { orderBy: { position: "asc" } } } });
    expect(after.number).toBe(first.renumbered[0].to);
    expect(after.invoiceNumber).toBeNull(); // never after the fact
    expect(after.items.map((item) => [item.productCode, item.attachment])).toEqual([
      ["P-CLP-HOND", "clip"],
      [`COL-CLP-${String(collectible.number).padStart(3, "0")}`, "clip"],
      ["P-FIG-KAT", null],
    ]);

    const second = await run();
    expect(second).toMatchObject({ attachments: 0, productCodes: 0, renumbered: [] });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).number).toBe(after.number);
  });
});
