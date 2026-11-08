import type { Attachment } from "./options";

/*
 * Codes, prefixes and widths of every ID, product code and file name. The names themselves are only ever built and
 * read in core/utils/naming.ts. A new edition or attachment is one line here; animals come from the live list
 * (core/modules/animals). No server-only imports.
 */

// Order: PLY1042. One running counter that never resets, starting at ORDER_START.
export const ORDER_PREFIX = "PLY";
export const ORDER_DIGITS = 4;
export const ORDER_START = 1001;
// bpost and Bancontact references allow at most this many characters.
export const ORDER_REF_MAX_LENGTH = 12;
// Order numbers from before the standard (PAL-2026-00042): still recognised wherever we read one back.
export const LEGACY_ORDER_PATTERN = /^PAL-\d{4}-\d{5,}$/;

// Invoice: F2026-0001, counted per year, only assigned once an order is paid.
export const INVOICE_PREFIX = "F";
export const INVOICE_DIGITS = 4;

// Preview without a paid order: PRV-A3F9C2E1, from the start of its id.
export const PREVIEW_PREFIX = "PRV";
export const PREVIEW_REF_LENGTH = 8;

// A physical Palley: PAL-PLY1042-01-P-RING-KAT. PAL- means nothing else.
export const PALLEY_PREFIX = "PAL";
export const PALLEY_INDEX_DIGITS = 2;
export const REPRINT_PREFIX = "R";

// Product codes: P-RING-KAT (personalised), COL-CLP-007 (collectible). Collectible id: COL-007-HOND.
export const PERSONALIZED_CODE = "P";
export const COLLECTIBLE_CODE = "COL";
export const COLLECTIBLE_DIGITS = 3;

// Edition codes: a figure has no attachment, a keychain is coded by how it goes on the keys.
export const FIGURE_EDITION_CODE = "FIG";
export const KEYCHAIN_EDITION_CODES = { clip: "CLP", "key-ring": "RING" } as const satisfies Record<Attachment, string>;

// Production batches for the print shop (JLC) and the bpost CSVs (how many labels per file: data/bpost.ts).
export const BATCH_PREFIX = "BATCH";
export const BATCH_DIGITS = 4;
export const BPOST_PREFIX = "BPOST";
export const BPOST_REGIONS = ["BE", "INT"] as const;
// Inside a batch zip: BATCH-0001/PLY1042/<palley>_print.zip, and the list for JLC at BATCH-0001/manifest.csv.
export const BATCH_MANIFEST_NAME = "manifest.csv";

// Several models from Goedgekeurd downloaded at once, for Blender: DOWNLOAD-20261108-3.zip.
export const DOWNLOAD_ZIP_PREFIX = "DOWNLOAD";

// File names next to a Palley's name, per kind of file.
export const PALLEY_FILE_SUFFIXES = {
  obj: ".obj",
  mtl: ".mtl",
  texture: ".png",
  model: ".zip", // the OBJ, MTL and PNG together, as downloaded for Blender
  preview: "_preview.glb",
  pose: "_pose.png",
  print: "_print.zip", // the processed zip from Blender
} as const;
