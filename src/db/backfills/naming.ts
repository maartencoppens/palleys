import "server-only";
import type { Prisma } from "@/db/generated/client";
import { DEFAULT_ANIMALS } from "@/data/animals";
import { DEFAULT_ATTACHMENT, type Attachment, type Edition } from "@/data/options";
import { catalogSettingsSchema } from "@/core/modules/settings/types";
import { collectibleProductCode } from "@/core/modules/collectibles/utils";
import { nextOrderNumber } from "@/core/modules/orders/service";
import { NamingError, parseOrderRef, productCode } from "@/core/utils/naming";

/*
 * Brings existing rows in line with the naming standard (core/utils/naming.ts), after the naming_standard migration.
 * Runs inside one transaction (the caller's), so it all lands or nothing does, and a dry run can roll back. Idempotent: it only touches what isn't right yet, so running it twice gives the same result. Never assigns invoice
 * numbers: those only come with a payment.
 *
 *   1. Collectibles without an animal get the one of the preview they were made from, or a known one by slug.
 *   2. Keychain and collectible lines without an attachment get the standard one (clip), as the cart does.
 *   3. Every line's product code is recomputed (P-CLP-KAT, COL-CLP-001).
 *   4. With renumberOrders only: orders with an old number (PAL-2026-00042) get a PLY number, oldest first. Their
 *      Bancontact payments keep the old reference, so only do this where the orders are test data.
 */

// Collectibles made by hand before they had an animal.
const KNOWN_COLLECTIBLE_ANIMALS: Record<string, string> = {
  "golden-retriever": "HOND",
  "tabby-kat": "KAT",
  schildpad: "SCHILDPAD",
  kameleon: "KAMELEON",
};

export type NamingBackfillOptions = {
  renumberOrders: boolean;
  /** Only these orders (and their lines), e.g. in a test. Collectibles are always all done. */
  orderIds?: string[];
};

export type NamingBackfillReport = {
  collectibleAnimals: number;
  attachments: number;
  productCodes: number;
  renumbered: { from: string; to: string }[];
  /** What couldn't be filled in and needs a person. */
  unresolved: string[];
};

export async function backfillNaming(db: Prisma.TransactionClient, options: NamingBackfillOptions): Promise<NamingBackfillReport> {
  const report: NamingBackfillReport = { collectibleAnimals: 0, attachments: 0, productCodes: 0, renumbered: [], unresolved: [] };
  const orderScope = options.orderIds ? { id: { in: options.orderIds } } : {};

  // 1. Collectible animals.
  const collectibles = await db.collectible.findMany({
    where: { animalCode: null },
    select: { id: true, slug: true, sourcePreview: { select: { animalType: true } } },
  });
  for (const collectible of collectibles) {
    const animalCode = collectible.sourcePreview?.animalType ?? KNOWN_COLLECTIBLE_ANIMALS[collectible.slug] ?? null;
    if (!animalCode) {
      report.unresolved.push(`Collectible ${collectible.slug}: kies het dier in de backoffice`);
      continue;
    }
    await db.collectible.update({ where: { id: collectible.id }, data: { animalCode } });
    report.collectibleAnimals++;
  }

  // 2. Attachments: a keychain always has one, and so does every collectible.
  const { count } = await db.orderItem.updateMany({
    where: { order: orderScope, attachment: null, OR: [{ edition: "keychain" }, { collectibleId: { not: null } }] },
    data: { attachment: DEFAULT_ATTACHMENT },
  });
  report.attachments = count;

  // 3. Product codes. Animal codes never change, so a removed animal of the starting list still has its code.
  const settings = await db.shopSettings.findUnique({ where: { id: 1 }, select: { catalog: true } });
  const animals = [...(catalogSettingsSchema.safeParse(settings?.catalog).data?.animals ?? []), ...DEFAULT_ANIMALS];
  const items = await db.orderItem.findMany({
    where: { order: orderScope },
    select: {
      id: true,
      productCode: true,
      edition: true,
      attachment: true,
      animal: true,
      collectible: { select: { number: true } },
      order: { select: { number: true } },
    },
  });
  for (const item of items) {
    const code = expectedProductCode(item, animals);
    if (!code) {
      report.unresolved.push(`Order ${item.order.number}, lijn ${item.id.slice(0, 8)}: geen productcode (${item.productCode})`);
      continue;
    }
    if (code === item.productCode) continue;
    await db.orderItem.update({ where: { id: item.id }, data: { productCode: code } });
    report.productCodes++;
  }

  // 4. Order numbers, oldest first, from the same counter as new orders.
  if (options.renumberOrders) {
    const orders = await db.order.findMany({
      where: orderScope,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, number: true },
    });
    for (const order of orders.filter(({ number }) => parseOrderRef(number) === null)) {
      const number = await nextOrderNumber(db);
      await db.order.update({ where: { id: order.id }, data: { number } });
      report.renumbered.push({ from: order.number, to: number });
    }
  }

  return report;
}

function expectedProductCode(
  item: { edition: string | null; attachment: string | null; animal: string | null; collectible: { number: number } | null },
  animals: { value: string; code: string }[],
) {
  const attachment = item.attachment as Attachment | null;
  try {
    if (item.collectible) return collectibleProductCode(item.collectible.number, attachment ?? DEFAULT_ATTACHMENT);
    const animal = animals.find((option) => option.value === item.animal);
    if (!animal || !item.edition) return null;
    return productCode({ kind: "P", edition: item.edition as Edition, attachment, animalCode: animal.code });
  } catch (error) {
    if (error instanceof NamingError) return null; // an edition or attachment that doesn't exist
    throw error;
  }
}
