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
  collectibleIdOf,
  slugify,
} from "./utils";
import { localizedTexts, parseTranslations } from "./translations";
import { palleyFileName } from "@/core/utils/naming";
import { readModelMeta, parseModelMeta } from "@/core/modules/print-prep/model-meta";
import { readStoredModelMeta } from "@/core/modules/print-prep/meta-store";
import { OPEN_ORDER_STATUSES } from "@/core/modules/orders/check-in";
import {
  missingTranslations,
  type AdminCollectible,
  type CollectibleGeneration,
  type CollectibleInput,
  type CollectibleModelVersion,
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
  stock: number | null;
};

const toView = (row: CollectibleRow, locale: Locale): CollectibleView => ({
  id: row.id,
  slug: row.slug,
  ...localizedTexts(row, locale),
  priceCents: row.priceCents,
  imageUrl: collectibleImageUrl(row.imageKey),
  soldOut: row.soldOut,
  stock: row.stock,
});

const VISIBLE = { published: true, archivedAt: null, imageKey: { not: null } } satisfies Prisma.CollectibleWhereInput;

export async function listPublishedCollectibles(locale: Locale, limit?: number): Promise<CollectibleView[]> {
  const rows = await prisma.collectible.findMany({ where: VISIBLE, orderBy: ORDER, take: limit });
  return rows.map((row) => toView(row, locale));
}

/** The published collectibles for the sitemap: their address, last change and photo. */
export async function listCollectiblesForSitemap() {
  const rows = await prisma.collectible.findMany({ where: VISIBLE, orderBy: ORDER, select: { slug: true, updatedAt: true, imageKey: true } });
  return rows.map((row) => ({ slug: row.slug, updatedAt: row.updatedAt, imageUrl: collectibleImageUrl(row.imageKey) }));
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

/** A generation for a collectible that hasn't given a model version yet (and didn't expire). */
const PENDING_GENERATION = { status: { not: "EXPIRED" }, collectibleModels: { none: {} } } satisfies Prisma.PreviewWhereInput;

export async function listCollectiblesForAdmin(): Promise<AdminCollectible[]> {
  const rows = await prisma.collectible.findMany({
    orderBy: ORDER,
    include: {
      orderItems: { where: { order: { paidAt: { not: null } } }, select: { quantity: true } },
      _count: { select: { generations: { where: PENDING_GENERATION }, orderItems: true } },
    },
  });
  return rows.map((row) => ({
    ...toView(row, DEFAULT_LOCALE),
    number: row.number,
    animalCode: row.animalCode,
    collectibleId: collectibleIdOf(row),
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
    generating: row._count.generations > 0,
    hasOrders: row._count.orderItems > 0,
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
/** The download is named after the collectible's id, which needs its animal. */
export class CollectibleAnimalMissingError extends Error {}

/** A model the browser says it uploaded must really be in R2 before the database points at it. */
async function assertModelUploaded(key: string | null, currentKey: string | null = null) {
  if (key && key !== currentKey && !(await objectExists(key))) throw new CollectibleModelMissingError(key);
}

/** A model the admin uploaded becomes a version of the collectible (unless it is one already). */
async function recordModelVersion(collectibleId: string, key: string, fileName: string | null, adminName: string) {
  const existing = await prisma.collectibleModel.findUnique({ where: { key }, select: { id: true } });
  if (existing) return existing;
  const meta = await readStoredModelMeta(key);
  return prisma.collectibleModel.create({
    data: { collectibleId, key, fileName, meta: meta ?? undefined, createdBy: adminName },
    select: { id: true },
  });
}

export async function createCollectible(input: CollectibleInput, adminName: string) {
  const modelKey = input.modelKey ?? null;
  await assertModelUploaded(modelKey);
  const slug = await uniqueSlug(input.name);
  const row = await prisma.collectible.create({
    data: { ...input, modelKey, modelFileName: modelKey ? (input.modelFileName ?? null) : null, slug, updatedBy: adminName },
    select: { id: true },
  });
  if (modelKey) await recordModelVersion(row.id, modelKey, input.modelFileName ?? null, adminName);
  return { id: row.id };
}

/**
 * Saves the product. The model only changes when the input says so (undefined = as it is): the edit page picks the
 * model among its versions, apart from this form. A replaced model stays as a version, nothing is deleted.
 */
export async function updateCollectible(id: string, input: CollectibleInput, adminName: string) {
  const current = await prisma.collectible.findUnique({ where: { id }, select: { imageKey: true, modelKey: true } });
  if (!current) throw new CollectibleNotFoundError(id);
  const { modelKey, modelFileName, ...rest } = input;
  if (modelKey !== undefined) await assertModelUploaded(modelKey, current.modelKey);
  await prisma.collectible.update({
    where: { id },
    data: { ...rest, ...(modelKey !== undefined && { modelKey, modelFileName: modelKey ? (modelFileName ?? null) : null }), updatedBy: adminName },
  });
  if (modelKey && modelKey !== current.modelKey) await recordModelVersion(id, modelKey, modelFileName ?? null, adminName);
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

/** Refusals for deleting for good; the message is shown as it is. */
export class CollectibleDeleteError extends Error {}

/**
 * Deletes an archived collectible for good: the row, its photo and every model version. Only when no open order still
 * needs it; lines on finished orders keep their title and product code but no longer point at it. Carts drop the line.
 */
export async function deleteCollectiblePermanently(id: string) {
  const collectible = await prisma.collectible.findUnique({
    where: { id },
    select: { archivedAt: true, imageKey: true, models: { select: { key: true } }, modelKey: true },
  });
  if (!collectible) throw new CollectibleNotFoundError(id);
  if (!collectible.archivedAt) throw new CollectibleDeleteError("Verwijder hem eerst van de website; daarna kan hij definitief weg");
  const open = await prisma.orderItem.findMany({
    where: { collectibleId: id, order: { status: { in: [...OPEN_ORDER_STATUSES, "PENDING_PAYMENT"] } } },
    select: { order: { select: { number: true } } },
  });
  if (open.length > 0) {
    const numbers = [...new Set(open.map((item) => item.order.number))].join(", ");
    throw new CollectibleDeleteError(`Nog nodig voor open orders (${numbers}): rond die eerst af`);
  }
  await prisma.$transaction([
    prisma.orderItem.updateMany({ where: { collectibleId: id }, data: { collectibleId: null } }),
    prisma.collectible.delete({ where: { id } }),
  ]);
  const keys = new Set([collectible.imageKey, collectible.modelKey, ...collectible.models.map((model) => model.key)]);
  await Promise.all([...keys].flatMap((key) => (key ? deleteImage(key) : [])));
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
  if (input.collectibleId) return startGenerationFor(input.collectibleId, input);
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
    const created = await tx.collectible.create({
      data: {
        name,
        slug,
        animalCode: input.animalType,
        priceCents: DEFAULT_COLLECTIBLE_PRICE_CENTS,
        published: false,
        sourcePreviewId: previewId,
        updatedBy: adminName,
      },
      select: { id: true },
    });
    await tx.preview.update({ where: { id: previewId }, data: { targetCollectibleId: created.id } });
    return created;
  });
  return { previewId, collectibleId: collectible.id };
}

/**
 * A new model for a collectible that exists already, with or without a model: its own preview through the same
 * pipeline. The result becomes one more version; the admin picks which one orders use.
 */
async function startGenerationFor(collectibleId: string, input: GenerateCollectibleInput) {
  const collectible = await prisma.collectible.findUnique({ where: { id: collectibleId }, select: { archivedAt: true, animalCode: true } });
  if (!collectible) throw new CollectibleNotFoundError(collectibleId);
  if (collectible.archivedAt) throw new CollectibleFromPreviewError("Deze collectible is verwijderd: zet hem eerst terug");
  const previewId = randomUUID();
  await prisma.preview.create({
    data: {
      id: previewId,
      status: "PAID",
      forCollectible: true,
      animalType: input.animalType ?? collectible.animalCode,
      promptOverride: input.prompt,
      expiresAt: null,
      targetCollectibleId: collectibleId,
    },
  });
  return { previewId, collectibleId };
}

/**
 * Puts a print-ready model on the collectible it was generated for, as a new version: the print zip is copied to the
 * collectible's own models, and the pose render becomes its photo if it has none yet. A collectible without a model
 * uses it right away; one that has a model keeps it until the admin picks the new version. Runs by itself when the
 * Blender zip is uploaded; copies, so the collectible keeps its files when the preview is cleaned up.
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
      targetCollectible: { select: { id: true, modelKey: true, imageKey: true } },
      collectible: { select: { id: true, modelKey: true, imageKey: true } },
    },
  });
  if (!preview) throw new CollectibleNotFoundError(previewId);
  if (!preview.forCollectible) throw new CollectibleFromPreviewError("Deze preview is voor een klant, niet voor een collectible");
  if (preview.status !== "PRINT_READY" || !preview.processedKey) {
    throw new CollectibleFromPreviewError("Upload eerst de printklare zip uit Blender (Processed)");
  }

  const zip = await getObject(preview.processedKey);
  let meta = null;
  try {
    meta = readModelMeta(zip);
  } catch {
    // Shown as unknown; the model itself is fine to keep.
  }
  const modelKey = collectibleModelKey(`${randomUUID()}.zip`);
  await putObject(modelKey, zip, PRINT_FILE_CONTENT_TYPE);
  const target = preview.targetCollectible ?? preview.collectible;
  const needsImage = !target?.imageKey && preview.poseImageKey;
  const image = needsImage ? await storeCollectibleImage(await getObject(preview.poseImageKey!)).catch(() => null) : null;
  const { catalog } = await getShopSettings();
  const name = draftName(catalog.animals, preview.animalType);
  const fileName = `${name}.zip`;
  const version = { key: modelKey, fileName, previewId, meta: meta ?? undefined, createdBy: adminName };

  if (target) {
    const activate = !target.modelKey;
    await prisma.$transaction([
      prisma.collectibleModel.create({ data: { ...version, collectibleId: target.id } }),
      prisma.collectible.update({
        where: { id: target.id },
        data: { ...(activate && { modelKey, modelFileName: fileName }), ...(image && { imageKey: image.imageKey }), updatedBy: adminName },
      }),
    ]);
    return { id: target.id, activated: activate };
  }
  // The draft was deleted in the meantime: make a new one.
  const slug = await uniqueSlug(name);
  const row = await prisma.collectible.create({
    data: {
      name,
      slug,
      animalCode: preview.animalType,
      priceCents: DEFAULT_COLLECTIBLE_PRICE_CENTS,
      published: false,
      updatedBy: adminName,
      modelKey,
      modelFileName: fileName,
      ...(image && { imageKey: image.imageKey }),
      models: { create: version },
    },
    select: { id: true },
  });
  await prisma.preview.update({ where: { id: previewId }, data: { targetCollectibleId: row.id } });
  return { id: row.id, activated: true };
}

// ---------- Model versions ----------

/** Every model version of a collectible, newest first, and the generations still under way. */
export async function getCollectibleModels(id: string): Promise<{ versions: CollectibleModelVersion[]; generations: CollectibleGeneration[] }> {
  const collectible = await prisma.collectible.findUnique({
    where: { id },
    select: {
      modelKey: true,
      models: {
        orderBy: { createdAt: "desc" },
        select: { id: true, key: true, fileName: true, meta: true, createdBy: true, createdAt: true, preview: { select: { id: true, poseImageKey: true } } },
      },
      generations: {
        where: PENDING_GENERATION,
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, createdAt: true, poseImageKey: true },
      },
    },
  });
  if (!collectible) throw new CollectibleNotFoundError(id);
  const signed = (key: string | null | undefined) => (key ? createDownloadUrl(key).catch(() => null) : Promise.resolve(null));
  const [versions, generations] = await Promise.all([
    Promise.all(
      collectible.models.map(async (model) => ({
        id: model.id,
        fileName: model.fileName,
        meta: parseModelMeta(model.meta),
        createdBy: model.createdBy,
        createdAt: model.createdAt.toISOString(),
        previewId: model.preview?.id ?? null,
        poseUrl: await signed(model.preview?.poseImageKey),
        active: model.key === collectible.modelKey,
      })),
    ),
    Promise.all(
      collectible.generations.map(async (generation) => ({
        previewId: generation.id,
        status: generation.status,
        createdAt: generation.createdAt.toISOString(),
        poseUrl: await signed(generation.poseImageKey),
      })),
    ),
  ]);
  return { versions, generations };
}

async function findVersion(collectibleId: string, modelId: string) {
  const model = await prisma.collectibleModel.findFirst({ where: { id: modelId, collectibleId }, select: { key: true, fileName: true } });
  if (!model) throw new CollectibleNotFoundError(modelId);
  return model;
}

/** An uploaded zip as a new version of an existing collectible; `activate` makes orders use it right away. */
export async function putCollectibleModelVersion(
  collectibleId: string,
  input: { modelKey: string; modelFileName: string | null; activate: boolean },
  adminName: string,
) {
  const collectible = await prisma.collectible.findUnique({ where: { id: collectibleId }, select: { modelKey: true } });
  if (!collectible) throw new CollectibleNotFoundError(collectibleId);
  await assertModelUploaded(input.modelKey);
  const version = await recordModelVersion(collectibleId, input.modelKey, input.modelFileName, adminName);
  if (input.activate || !collectible.modelKey) {
    await prisma.collectible.update({ where: { id: collectibleId }, data: { modelKey: input.modelKey, modelFileName: input.modelFileName, updatedBy: adminName } });
  }
  return { id: version.id };
}

/** Reads size, triangles and texture of a version that has none yet (from before we read them). */
export async function refreshCollectibleModelMeta(collectibleId: string, modelId: string) {
  const model = await findVersion(collectibleId, modelId);
  const meta = await readStoredModelMeta(model.key);
  if (!meta) throw new CollectibleDeleteError("Dit bestand kon niet gelezen worden: zit er een OBJ in de zip?");
  await prisma.collectibleModel.update({ where: { id: modelId }, data: { meta } });
  return { id: modelId, meta };
}

/** Orders use this version from now on; the others stay. */
export async function selectCollectibleModel(collectibleId: string, modelId: string, adminName: string) {
  const model = await findVersion(collectibleId, modelId);
  await prisma.collectible.update({ where: { id: collectibleId }, data: { modelKey: model.key, modelFileName: model.fileName, updatedBy: adminName } });
  return { id: collectibleId };
}

/** Removes a version that isn't in use, file and all. */
export async function deleteCollectibleModel(collectibleId: string, modelId: string) {
  const [model, collectible] = await Promise.all([
    findVersion(collectibleId, modelId),
    prisma.collectible.findUnique({ where: { id: collectibleId }, select: { modelKey: true } }),
  ]);
  if (collectible?.modelKey === model.key) throw new CollectibleDeleteError("Dit model wordt gebruikt: kies eerst een ander");
  await prisma.collectibleModel.delete({ where: { id: modelId } });
  await deleteImage(model.key);
  return { id: modelId };
}

/** Step 1 of an upload: a signed URL straight to R2, so a big zip never passes through our server. */
export async function createModelUpload() {
  const key = collectibleModelKey(`${randomUUID()}.zip`);
  return { key, uploadUrl: await createUploadUrl(key, PRINT_FILE_CONTENT_TYPE) };
}

/** A fresh signed link per click: one made when the page loaded would have expired. */
export async function getCollectibleModelDownload(id: string, modelId?: string) {
  const row = await prisma.collectible.findUnique({ where: { id }, select: { modelKey: true, number: true, animalCode: true } });
  if (!row) throw new CollectibleNotFoundError(id);
  const key = modelId ? (await findVersion(id, modelId)).key : row.modelKey;
  if (!key) throw new CollectibleModelMissingError(id);
  const name = collectibleIdOf(row);
  if (!name) throw new CollectibleAnimalMissingError(id);
  // A version other than the one in use gets its id in the name, so the two never mix up on disk.
  const fileName = palleyFileName(name, "print").replace(/\.zip$/, key === row.modelKey ? ".zip" : `-v${modelId!.slice(0, 6)}.zip`);
  return { url: await createDownloadUrl(key, fileName), fileName };
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
