import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { prisma } from "@/db/client";
import { Prisma } from "@/db/generated/client";
import {
  createDownloadUrl,
  createUploadUrl,
  deleteObject,
  getObject,
  objectExists,
  putObject,
} from "@/core/networking/external/storage-client";
import { PRINT_FILE_CONTENT_TYPE } from "@/data/uploads";
import { findAnimalByCode } from "@/core/modules/animals/utils";
import type { AnimalOption } from "@/core/modules/animals/types";
import { getShopSettings } from "@/core/modules/settings/service";
import { COLLECTIBLE_IMAGE_MAX_PX, COLLECTIBLE_IMAGE_QUALITY, DEFAULT_COLLECTIBLE_PRICE_CENTS } from "@/data/collectibles";
import { DEFAULT_LOCALE, type Locale } from "@/core/locale/config";
import {
  collectibleImageKey,
  collectibleImageUrl,
  collectibleModelKey,
  isCollectibleImageFile,
  modelDownloadName,
  skuForSlug,
  slugify,
} from "./utils";
import { localizedTexts, parseTranslations } from "./translations";
import {
  missingTranslations,
  type AdminCollectible,
  type CollectibleInput,
  type CollectibleView,
  type GenerateCollectibleInput,
} from "./types";

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
    modelKey: row.modelKey,
    modelFileName: row.modelFileName,
    sourcePreviewId: row.sourcePreviewId,
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

export class CollectibleModelMissingError extends Error {}

/** A model the browser says it uploaded must really be in R2 before the database points at it. */
async function assertModelUploaded(key: string | null, currentKey: string | null = null) {
  if (key && key !== currentKey && !(await objectExists(key))) throw new CollectibleModelMissingError(key);
}

export async function createCollectible(input: CollectibleInput, adminName: string) {
  await assertModelUploaded(input.modelKey);
  const slug = await uniqueSlug(input.name);
  const row = await prisma.collectible.create({
    data: { ...input, slug, sku: skuForSlug(slug), updatedBy: adminName },
    select: { id: true },
  });
  return { id: row.id };
}

export async function updateCollectible(id: string, input: CollectibleInput, adminName: string) {
  const current = await prisma.collectible.findUnique({ where: { id }, select: { imageKey: true, modelKey: true } });
  if (!current) throw new CollectibleNotFoundError(id);
  await assertModelUploaded(input.modelKey, current.modelKey);
  await prisma.collectible.update({ where: { id }, data: { ...input, updatedBy: adminName } });
  if (current.imageKey && current.imageKey !== input.imageKey) await deleteImage(current.imageKey);
  if (current.modelKey && current.modelKey !== input.modelKey) await deleteImage(current.modelKey);
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

// ---------- 3D model ----------

/** Refusals the admin can act on; the message is shown as it is. */
export class CollectibleFromPreviewError extends Error {}

const draftName = (animals: AnimalOption[], animalType: string | null) => {
  const animal = findAnimalByCode(animals, animalType);
  return animal ? `Nieuwe collectible: ${animal.labels.nl}` : "Nieuwe collectible";
};

/**
 * Starts a new collectible's model, apart from any order: a preview that goes through the same pipeline as a customer's
 * Palley (pose, 3D model, review, Blender), with the admin's own prompt, and a hidden collectible waiting for its model.
 * The preview starts as PAID, the status from which the pipeline begins; nobody paid, it was never for sale.
 */
export async function startCollectibleGeneration(input: GenerateCollectibleInput, adminName: string) {
  const { catalog } = await getShopSettings();
  if (input.animalType && !findAnimalByCode(catalog.animals, input.animalType)) {
    throw new CollectibleFromPreviewError("Dit dier staat niet in de lijst");
  }
  const previewId = randomUUID();
  const name = draftName(catalog.animals, input.animalType);
  const slug = await uniqueSlug(name);
  const collectible = await prisma.$transaction(async (tx) => {
    await tx.preview.create({
      data: {
        id: previewId,
        status: "PAID",
        forCollectible: true,
        animalType: input.animalType,
        promptOverride: input.prompt,
        expiresAt: null,
      },
    });
    return tx.collectible.create({
      data: {
        name,
        slug,
        sku: skuForSlug(slug),
        priceCents: DEFAULT_COLLECTIBLE_PRICE_CENTS,
        published: false,
        sourcePreviewId: previewId,
        updatedBy: adminName,
      },
      select: { id: true },
    });
  });
  return { previewId, collectibleId: collectible.id };
}

/**
 * Puts a print-ready model on the collectible it was generated for: the print zip is copied to the collectible's own
 * model, and the pose render becomes its photo if it has none yet. Runs by itself when the Blender zip is uploaded;
 * copies, so the collectible keeps its files when the preview is cleaned up. Uploading a new zip replaces the model.
 */
export async function attachPreviewModel(previewId: string, adminName: string) {
  const preview = await prisma.preview.findUnique({
    where: { id: previewId },
    select: {
      status: true,
      forCollectible: true,
      processedKey: true,
      poseImageKey: true,
      animalType: true,
      collectible: { select: { id: true, modelKey: true, imageKey: true } },
    },
  });
  if (!preview) throw new CollectibleNotFoundError(previewId);
  if (!preview.forCollectible) throw new CollectibleFromPreviewError("Deze preview is voor een klant, niet voor een collectible");
  if (preview.status !== "PRINT_READY" || !preview.processedKey) {
    throw new CollectibleFromPreviewError("Upload eerst de printklare zip uit Blender (Processed)");
  }

  const modelKey = collectibleModelKey(`${randomUUID()}.zip`);
  await putObject(modelKey, await getObject(preview.processedKey), PRINT_FILE_CONTENT_TYPE);
  const needsImage = !preview.collectible?.imageKey && preview.poseImageKey;
  const image = needsImage ? await storeCollectibleImage(await getObject(preview.poseImageKey!)).catch(() => null) : null;
  const { catalog } = await getShopSettings();
  const name = draftName(catalog.animals, preview.animalType);
  const files = { modelKey, modelFileName: `${name}.zip`, ...(image && { imageKey: image.imageKey }) };

  if (preview.collectible) {
    await prisma.collectible.update({ where: { id: preview.collectible.id }, data: { ...files, updatedBy: adminName } });
    if (preview.collectible.modelKey) await deleteImage(preview.collectible.modelKey);
    return { id: preview.collectible.id };
  }
  // The draft was removed in the meantime: make a new one.
  const slug = await uniqueSlug(name);
  const row = await prisma.collectible.create({
    data: {
      name,
      slug,
      sku: skuForSlug(slug),
      priceCents: DEFAULT_COLLECTIBLE_PRICE_CENTS,
      published: false,
      sourcePreviewId: previewId,
      updatedBy: adminName,
      ...files,
    },
    select: { id: true },
  });
  return { id: row.id };
}

/** Step 1 of an upload: a signed URL straight to R2, so a big zip never passes through our server. */
export async function createModelUpload() {
  const key = collectibleModelKey(`${randomUUID()}.zip`);
  return { key, uploadUrl: await createUploadUrl(key, PRINT_FILE_CONTENT_TYPE) };
}

/** A fresh signed link per click: one made when the page loaded would have expired. */
export async function getCollectibleModelDownload(id: string) {
  const row = await prisma.collectible.findUnique({ where: { id }, select: { modelKey: true, modelFileName: true, sku: true } });
  if (!row) throw new CollectibleNotFoundError(id);
  if (!row.modelKey) throw new CollectibleModelMissingError(id);
  const fileName = modelDownloadName(row.modelFileName, row.sku);
  return { url: await createDownloadUrl(row.modelKey, fileName), fileName };
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
