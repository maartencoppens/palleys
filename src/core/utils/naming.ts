import { z } from "zod";
import type { Attachment, Edition } from "@/data/options";
import {
  BATCH_DIGITS,
  BATCH_MANIFEST_NAME,
  BATCH_PREFIX,
  BPOST_PREFIX,
  BPOST_REGIONS,
  COLLECTIBLE_CODE,
  COLLECTIBLE_DIGITS,
  DOWNLOAD_ZIP_PREFIX,
  FIGURE_EDITION_CODE,
  INVOICE_DIGITS,
  INVOICE_PREFIX,
  KEYCHAIN_EDITION_CODES,
  LEGACY_ORDER_PATTERN,
  ORDER_DIGITS,
  ORDER_PREFIX,
  ORDER_REF_MAX_LENGTH,
  PALLEY_FILE_SUFFIXES,
  PALLEY_INDEX_DIGITS,
  PALLEY_PREFIX,
  PERSONALIZED_CODE,
  PREVIEW_PREFIX,
  PREVIEW_REF_LENGTH,
  REPRINT_PREFIX,
} from "@/data/naming";
import { formatDateCompact } from "./format";

/*
 * The one place where IDs, product codes and file names are built and read back. Pure, also used in the browser.
 * The database keeps the parts (order number, line position, edition, attachment, animal, collectible number); the
 * names are always computed here. Builders throw a NamingError on input that can't make a valid name; parsers return
 * null for anything that isn't exactly what the builder would make.
 */

export class NamingError extends Error {}

export type EditionCode = typeof FIGURE_EDITION_CODE | (typeof KEYCHAIN_EDITION_CODES)[Attachment];
export type BpostRegion = (typeof BPOST_REGIONS)[number];
export type PalleyFileKind = keyof typeof PALLEY_FILE_SUFFIXES;

const pad = (value: number, width: number) => String(value).padStart(width, "0");

function assertNumber(value: number, what: string, min = 1) {
  if (!Number.isSafeInteger(value) || value < min) throw new NamingError(`Invalid ${what}: ${value}`);
}

// Animal codes are made by core/modules/animals: capitals and digits only (HOND, PAPEGAAI2).
const ANIMAL_CODE = /^[A-Z0-9]+$/;
function assertAnimalCode(code: string) {
  if (!ANIMAL_CODE.test(code)) throw new NamingError(`Invalid animal code: ${code}`);
}

// A file's base name: capitals and digits in groups joined by single hyphens.
const BASE_NAME = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

/** A Zod schema that only accepts what `build` would make from what `read` gets out of the match. */
function canonical<T>(pattern: RegExp, read: (groups: string[]) => T, build: (value: T) => string) {
  return z.string().transform((value, ctx) => {
    const match = pattern.exec(value);
    try {
      const parsed = match ? read(match.slice(1)) : null;
      if (parsed !== null && build(parsed) === value) return parsed;
    } catch (error) {
      if (!(error instanceof NamingError)) throw error;
    }
    ctx.addIssue({ code: "custom", message: `Not a valid name: ${value}` });
    return z.NEVER;
  });
}

const parseWith =
  <T>(schema: z.ZodType<T, string>) =>
  (value: string): T | null =>
    schema.safeParse(value).data ?? null;

// ---------- Order ----------

/** 1042 → "PLY1042". */
export function orderRef(seq: number) {
  assertNumber(seq, "order sequence");
  const ref = `${ORDER_PREFIX}${pad(seq, ORDER_DIGITS)}`;
  if (ref.length > ORDER_REF_MAX_LENGTH) throw new NamingError(`Order number too long: ${ref}`);
  return ref;
}

export const orderRefSchema = canonical(new RegExp(`^${ORDER_PREFIX}(\\d+)$`), ([seq]) => Number(seq), orderRef);
export const parseOrderRef = parseWith(orderRefSchema);

/** An order number as we hand it out (PLY1042), or one from before the standard (PAL-2026-00042). */
export function isOrderRef(value: string) {
  return parseOrderRef(value) !== null || LEGACY_ORDER_PATTERN.test(value);
}

// ---------- Invoice ----------

/** 2026, 1 → "F2026-0001". */
export function invoiceNumber(year: number, seq: number) {
  if (!Number.isSafeInteger(year) || year < 1000 || year > 9999) throw new NamingError(`Invalid invoice year: ${year}`);
  assertNumber(seq, "invoice sequence");
  return `${INVOICE_PREFIX}${year}-${pad(seq, INVOICE_DIGITS)}`;
}

export const invoiceNumberSchema = canonical(
  new RegExp(`^${INVOICE_PREFIX}(\\d{4})-(\\d+)$`),
  ([year, seq]) => ({ year: Number(year), seq: Number(seq) }),
  ({ year, seq }) => invoiceNumber(year, seq),
);
export const parseInvoiceNumber = parseWith(invoiceNumberSchema);

// ---------- Preview ----------

/** A preview's uuid → "PRV-A3F9C2E1", until there's a paid order to name it after. */
export function previewRef(previewId: string) {
  if (!z.uuid().safeParse(previewId).success) throw new NamingError(`Invalid preview id: ${previewId}`);
  return `${PREVIEW_PREFIX}-${previewId.slice(0, PREVIEW_REF_LENGTH).toUpperCase()}`;
}

/** "PRV-A3F9C2E1" → "a3f9c2e1": the start of the preview id, to look it up with. */
export const previewRefSchema = z
  .string()
  .regex(new RegExp(`^${PREVIEW_PREFIX}-[0-9A-F]{${PREVIEW_REF_LENGTH}}$`))
  .transform((value) => value.slice(PREVIEW_PREFIX.length + 1).toLowerCase());
export const parsePreviewRef = parseWith(previewRefSchema);

// ---------- Product codes ----------

const EDITION_CODE_LIST: readonly EditionCode[] = [FIGURE_EDITION_CODE, ...Object.values(KEYCHAIN_EDITION_CODES)];
const EDITION_CODE_ALTERNATIVES = EDITION_CODE_LIST.join("|");
const EDITION_CODE_GROUP = `(${EDITION_CODE_ALTERNATIVES})`;

/** Figure → FIG; a keychain by its attachment: clip → CLP, key-ring → RING. A figure has no attachment. */
export function editionCode({ edition, attachment }: { edition: Edition; attachment: Attachment | null }): EditionCode {
  if (edition === "figure") {
    if (attachment !== null) throw new NamingError(`A figure has no attachment (${attachment})`);
    return FIGURE_EDITION_CODE;
  }
  if (edition !== "keychain") throw new NamingError(`Unknown edition: ${edition}`);
  const code = attachment !== null && Object.hasOwn(KEYCHAIN_EDITION_CODES, attachment) ? KEYCHAIN_EDITION_CODES[attachment] : null;
  if (!code) throw new NamingError(`A keychain needs an attachment (${attachment})`);
  return code;
}

/** The edition and attachment behind an edition code, the reverse of editionCode. */
function editionOf(code: string): { edition: Edition; attachment: Attachment | null } {
  if (code === FIGURE_EDITION_CODE) return { edition: "figure", attachment: null };
  const attachment = (Object.keys(KEYCHAIN_EDITION_CODES) as Attachment[]).find((key) => KEYCHAIN_EDITION_CODES[key] === code);
  if (!attachment) throw new NamingError(`Unknown edition code: ${code}`);
  return { edition: "keychain", attachment };
}

export type ProductCodeInput =
  | { kind: typeof PERSONALIZED_CODE; edition: Edition; attachment: Attachment | null; animalCode: string }
  | { kind: typeof COLLECTIBLE_CODE; edition: Edition; attachment: Attachment | null; collectibleNr: number };

/** P-RING-KAT for a personalised Palley, COL-CLP-007 for a collectible. */
export function productCode(input: ProductCodeInput) {
  const edition = editionCode(input);
  if (input.kind === PERSONALIZED_CODE) {
    assertAnimalCode(input.animalCode);
    return `${PERSONALIZED_CODE}-${edition}-${input.animalCode}`;
  }
  if (input.kind !== COLLECTIBLE_CODE) throw new NamingError(`Unknown product kind: ${(input as { kind: string }).kind}`);
  assertNumber(input.collectibleNr, "collectible number");
  return `${COLLECTIBLE_CODE}-${edition}-${pad(input.collectibleNr, COLLECTIBLE_DIGITS)}`;
}

// The same shape as a non-capturing group, to find a product code inside a Palley's name.
const PRODUCT_CODE_SOURCE = `(?:${PERSONALIZED_CODE}|${COLLECTIBLE_CODE})-(?:${EDITION_CODE_ALTERNATIVES})-[A-Z0-9]+`;

export const productCodeSchema = canonical(
  new RegExp(`^(${PERSONALIZED_CODE}|${COLLECTIBLE_CODE})-${EDITION_CODE_GROUP}-([A-Z0-9]+)$`),
  ([kind, code, rest]): ProductCodeInput =>
    kind === PERSONALIZED_CODE
      ? { kind: PERSONALIZED_CODE, ...editionOf(code), animalCode: rest }
      : { kind: COLLECTIBLE_CODE, ...editionOf(code), collectibleNr: /^\d+$/.test(rest) ? Number(rest) : NaN },
  productCode,
);
export const parseProductCode = parseWith(productCodeSchema);

// ---------- Collectible ----------

/** 7, HOND → "COL-007-HOND": the collectible in the catalog and its design files. */
export function collectibleId(collectibleNr: number, animalCode: string) {
  assertNumber(collectibleNr, "collectible number");
  assertAnimalCode(animalCode);
  return `${COLLECTIBLE_CODE}-${pad(collectibleNr, COLLECTIBLE_DIGITS)}-${animalCode}`;
}

export const collectibleIdSchema = canonical(
  new RegExp(`^${COLLECTIBLE_CODE}-(\\d+)-([A-Z0-9]+)$`),
  ([nr, animalCode]) => ({ collectibleNr: Number(nr), animalCode }),
  ({ collectibleNr, animalCode }) => collectibleId(collectibleNr, animalCode),
);
export const parseCollectibleId = parseWith(collectibleIdSchema);

// ---------- Palley (one physical copy) ----------

export type PalleyNameInput = { orderRef: string; index: number; productCode: string; reprintNr?: number };

/**
 * PAL-PLY1042-01-P-RING-KAT: the order, the line's position in it (from 1) and its product code. A reprint gets
 * -R1, -R2, ... One line with quantity 3 is still one name: the same file, printed three times.
 */
export function palleyName({ orderRef: order, index, productCode: code, reprintNr = 0 }: PalleyNameInput) {
  if (parseOrderRef(order) === null) throw new NamingError(`Invalid order number: ${order}`);
  assertNumber(index, "line position");
  if (parseProductCode(code) === null) throw new NamingError(`Invalid product code: ${code}`);
  assertNumber(reprintNr, "reprint number", 0);
  const reprint = reprintNr > 0 ? `-${REPRINT_PREFIX}${reprintNr}` : "";
  return `${PALLEY_PREFIX}-${order}-${pad(index, PALLEY_INDEX_DIGITS)}-${code}${reprint}`;
}

export const palleyNameSchema = canonical(
  new RegExp(`^${PALLEY_PREFIX}-(${ORDER_PREFIX}\\d+)-(\\d+)-(${PRODUCT_CODE_SOURCE})(?:-${REPRINT_PREFIX}(\\d+))?$`),
  ([order, index, code, reprint]): Required<PalleyNameInput> => ({
    orderRef: order,
    index: Number(index),
    productCode: code,
    reprintNr: reprint === undefined ? 0 : Number(reprint),
  }),
  palleyName,
);
export const parsePalleyName = parseWith(palleyNameSchema);

// ---------- Files ----------

/**
 * A file next to a name: PAL-PLY1042-01-P-RING-KAT.obj, ..._preview.glb, ..._print.zip. The base is a Palley's name,
 * a preview's ref (PRV-...) or a collectible's id (COL-007-HOND_print.zip).
 */
export function palleyFileName(baseName: string, kind: PalleyFileKind) {
  if (!BASE_NAME.test(baseName)) throw new NamingError(`Invalid base name: ${baseName}`);
  const suffix = PALLEY_FILE_SUFFIXES[kind];
  if (!suffix) throw new NamingError(`Unknown file kind: ${kind}`);
  return `${baseName}${suffix}`;
}

// Longest suffix first, so "_print.zip" isn't read as ".zip".
const FILE_KINDS = (Object.keys(PALLEY_FILE_SUFFIXES) as PalleyFileKind[]).sort(
  (a, b) => PALLEY_FILE_SUFFIXES[b].length - PALLEY_FILE_SUFFIXES[a].length,
);

/** "PAL-PLY1042-01-P-RING-KAT_print.zip" → its base name and kind, e.g. to check an uploaded file. */
export const palleyFileNameSchema = z.string().transform((value, ctx) => {
  const kind = FILE_KINDS.find((candidate) => value.endsWith(PALLEY_FILE_SUFFIXES[candidate]));
  const baseName = kind && value.slice(0, -PALLEY_FILE_SUFFIXES[kind].length);
  if (kind && baseName && BASE_NAME.test(baseName)) return { baseName, kind };
  ctx.addIssue({ code: "custom", message: `Not a valid file name: ${value}` });
  return z.NEVER;
});
export const parsePalleyFileName = parseWith(palleyFileNameSchema);

/** Several models downloaded at once, until batches exist: DOWNLOAD-20261108-3.zip. */
export function downloadZipName(date: Date, count: number) {
  assertNumber(count, "model count");
  return `${DOWNLOAD_ZIP_PREFIX}-${formatDateCompact(date)}-${count}.zip`;
}

// ---------- Batches and bpost ----------

/** 1 → "BATCH-0001". */
export function batchRef(seq: number) {
  assertNumber(seq, "batch sequence");
  return `${BATCH_PREFIX}-${pad(seq, BATCH_DIGITS)}`;
}

export const batchRefSchema = canonical(new RegExp(`^${BATCH_PREFIX}-(\\d+)$`), ([seq]) => Number(seq), batchRef);
export const parseBatchRef = parseWith(batchRefSchema);

/** "BATCH-0001" → "BATCH-0001.zip", the download for the print shop. */
export function batchZipName(ref: string) {
  if (parseBatchRef(ref) === null) throw new NamingError(`Invalid batch: ${ref}`);
  return `${ref}.zip`;
}

/** Where a file goes in a batch zip: BATCH-0001/PLY1042/PAL-PLY1042-01-P-RING-KAT_print.zip. */
export function batchZipEntry(ref: string, order: string, fileName: string) {
  if (parseBatchRef(ref) === null) throw new NamingError(`Invalid batch: ${ref}`);
  if (parseOrderRef(order) === null) throw new NamingError(`Invalid order number: ${order}`);
  if (parsePalleyFileName(fileName) === null) throw new NamingError(`Invalid file name: ${fileName}`);
  return `${ref}/${order}/${fileName}`;
}

/** The list for JLC in a batch zip: BATCH-0001/manifest.csv. */
export function batchManifestEntry(ref: string) {
  if (parseBatchRef(ref) === null) throw new NamingError(`Invalid batch: ${ref}`);
  return `${ref}/${BATCH_MANIFEST_NAME}`;
}

/** "BATCH-0001", BE, 1 → "BPOST-BATCH-0001-BE-1.csv": one file of labels for the bpost tool. */
export function bpostCsvName(ref: string, region: BpostRegion, part: number) {
  if (parseBatchRef(ref) === null) throw new NamingError(`Invalid batch: ${ref}`);
  if (!BPOST_REGIONS.includes(region)) throw new NamingError(`Invalid bpost region: ${region}`);
  assertNumber(part, "CSV part");
  return `${BPOST_PREFIX}-${ref}-${region}-${part}.csv`;
}
