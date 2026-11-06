import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { prisma } from "@/db/client";
import { Prisma } from "@/db/generated/client";
import { deleteObject, getObject, putObject } from "@/core/networking/external/storage-client";
import { COLLECTIBLE_IMAGE_MAX_PX, COLLECTIBLE_IMAGE_QUALITY } from "@/data/collectibles";
import { DEFAULT_LOCALE, type Locale } from "@/core/locale/config";
import {
  collectibleImageKey,
  collectibleImageUrl,
  isCollectibleImageFile,
  skuForSlug,
  slugify,
} from "./utils";
import { localizedTexts, parseTranslations } from "./translations";
import { missingTranslations, type AdminCollectible, type CollectibleInput, type CollectibleView } from "./types";

/*
 * Premade models customers buy as they are. They skip the AI pipeline: an order item for one goes straight to the
 * check-in on the order page. Deleting archives (orders keep pointing at them, and it can be undone).
 */

export class CollectibleNotFoundError extends Error {}

const ORDER = [{ sortOrder: "asc" }, { createdAt: "asc" }] satisfies Prisma.CollectibleOrderByWithRelationInput[];

type CollectibleRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tag: string | null;
  translations: Prisma.JsonValue;
  priceCents: number;
  imageKey: string | null;
  soldOut: boolean;
};

const toView = (row: CollectibleRow, locale: Locale): CollectibleView => ({
  id: row.id,
  slug: row.slug,
  ...localizedTexts(row, locale),
  priceCents: row.priceCents,
  imageUrl: collectibleImageUrl(row.imageKey),
  soldOut: row.soldOut,
});

const VISIBLE = { published: true, archivedAt: null, imageKey: { not: null } } satisfies Prisma.CollectibleWhereInput;

export async function listPublishedCollectibles(locale: Locale, limit?: number): Promise<CollectibleView[]> {
  const rows = await prisma.collectible.findMany({ where: VISIBLE, orderBy: ORDER, take: limit });
  return rows.map((row) => toView(row, locale));
}

export async function getPublishedCollectible(slug: string, locale: Locale): Promise<CollectibleView | null> {
  const row = await prisma.collectible.findFirst({ where: { slug, ...VISIBLE } });
  return row && toView(row, locale);
}

/** The collectibles a shopper can add to a cart right now. */
export async function findOrderableCollectible(id: string) {
  return prisma.collectible.findFirst({ where: { id, ...VISIBLE, soldOut: false } });
}

// ---------- Admin ----------

export async function listCollectiblesForAdmin(): Promise<AdminCollectible[]> {
  const rows = await prisma.collectible.findMany({
    orderBy: ORDER,
    include: { orderItems: { where: { order: { paidAt: { not: null } } }, select: { quantity: true } } },
  });
  return rows.map((row) => ({
    ...toView(row, DEFAULT_LOCALE),
    sku: row.sku,
    translations: parseTranslations(row.translations),
    missingTranslations: missingTranslations({ ...row, translations: parseTranslations(row.translations) }),
    imageKey: row.imageKey,
    published: row.published,
    sortOrder: row.sortOrder,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    orderedQuantity: row.orderItems.reduce((sum, item) => sum + item.quantity, 0),
  }));
}

export async function getCollectibleForAdmin(id: string): Promise<AdminCollectible | null> {
  const row = (await listCollectiblesForAdmin()).find((collectible) => collectible.id === id);
  return row ?? null;
}

/** Collectibles an admin can put on a manual order: also hidden and sold-out ones, not archived ones. */
export async function listCollectiblesForManualOrder() {
  const rows = await prisma.collectible.findMany({ where: { archivedAt: null }, orderBy: ORDER });
  return rows.map((row) => toView(row, DEFAULT_LOCALE));
}

async function uniqueSlug(name: string) {
  const base = slugify(name) || "collectible";
  const taken = await prisma.collectible.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  });
  const slugs = new Set(taken.map((row) => row.slug));
  if (!slugs.has(base)) return base;
  let suffix = 2;
  while (slugs.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

export async function createCollectible(input: CollectibleInput, adminName: string) {
  const slug = await uniqueSlug(input.name);
  const row = await prisma.collectible.create({
    data: { ...input, slug, sku: skuForSlug(slug), updatedBy: adminName },
    select: { id: true },
  });
  return { id: row.id };
}

export async function updateCollectible(id: string, input: CollectibleInput, adminName: string) {
  const current = await prisma.collectible.findUnique({ where: { id }, select: { imageKey: true } });
  if (!current) throw new CollectibleNotFoundError(id);
  await prisma.collectible.update({ where: { id }, data: { ...input, updatedBy: adminName } });
  if (current.imageKey && current.imageKey !== input.imageKey) await deleteImage(current.imageKey);
  return { id };
}

/** Removes it from the website and from the admin's list of active products. Carts drop the line by themselves. */
export async function archiveCollectible(id: string, adminName: string) {
  const { count } = await prisma.collectible.updateMany({
    where: { id, archivedAt: null },
    data: { archivedAt: new Date(), published: false, updatedBy: adminName },
  });
  if (count === 0) throw new CollectibleNotFoundError(id);
  return { id };
}

/** Back in the list, but hidden until an admin puts it on the website again. */
export async function restoreCollectible(id: string, adminName: string) {
  const { count } = await prisma.collectible.updateMany({
    where: { id, archivedAt: { not: null } },
    data: { archivedAt: null, updatedBy: adminName },
  });
  if (count === 0) throw new CollectibleNotFoundError(id);
  return { id };
}

// ---------- Images ----------

export class InvalidCollectibleImageError extends Error {}

/** Converts an admin's upload to a WebP without metadata and stores it under a new, unguessable name. */
export async function storeCollectibleImage(file: Buffer) {
  let image: Buffer;
  try {
    image = await sharp(file)
      .rotate()
      .resize({ width: COLLECTIBLE_IMAGE_MAX_PX, height: COLLECTIBLE_IMAGE_MAX_PX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: COLLECTIBLE_IMAGE_QUALITY })
      .toBuffer();
  } catch {
    throw new InvalidCollectibleImageError();
  }
  const key = collectibleImageKey(`${randomUUID()}.webp`);
  await putObject(key, image, "image/webp");
  return { imageKey: key, imageUrl: collectibleImageUrl(key)! };
}

async function deleteImage(key: string) {
  try {
    await deleteObject(key);
  } catch (error) {
    console.error(`Could not delete ${key}:`, error instanceof Error ? error.message : error);
  }
}

/** The image bytes for the public route. Null for anything that isn't one of ours. */
export async function readCollectibleImage(fileName: string) {
  if (!isCollectibleImageFile(fileName)) return null;
  try {
    return await getObject(collectibleImageKey(fileName));
  } catch (error) {
    console.warn(`Collectible image ${fileName} unavailable:`, error instanceof Error ? error.message : error);
    return null;
  }
}
