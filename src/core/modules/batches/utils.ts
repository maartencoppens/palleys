import { batchManifestEntry, batchZipEntry, palleyFileName, parseProductCode } from "@/core/utils/naming";
import { palleyNameOf } from "@/core/modules/orders/utils";
import { isPersonalDelivery } from "@/data/shipping";
import type { PreviewStatus } from "@/db/generated/enums";

/* What goes into a batch and how it is named. Pure: the service reads the database, this decides. */

export type BatchItemSource = {
  position: number;
  productCode: string;
  reprintNr: number;
  quantity: number;
  preview: { status: PreviewStatus; processedKey: string | null } | null;
  collectible: { modelKey: string | null } | null;
};

/** The file JLC prints from: the processed zip from Blender, or the collectible's own model. */
export function printFileKey(item: BatchItemSource) {
  if (item.preview) return item.preview.status === "PRINT_READY" ? item.preview.processedKey : null;
  return item.collectible?.modelKey ?? null;
}

export const isItemPrintReady = (item: BatchItemSource) => printFileKey(item) !== null;

/** Every item ready: only then can the order go into a batch (orders are never split). */
export const isOrderPrintReady = (items: BatchItemSource[]) => items.length > 0 && items.every(isItemPrintReady);

/** Where an order goes after post-production: a parcel (bpost) or picked up / handed over. Anything else is wrong. */
export function deliveryGroup(deliveryType: string | null | undefined): "deliver" | "pickup" | "other" {
  if (deliveryType === "HOME") return "deliver";
  if (isPersonalDelivery(deliveryType)) return "pickup";
  return "other";
}

/** What SHIPPED means for this order, in the backoffice. */
export function finishedLabel(deliveryType: string | null | undefined) {
  if (deliveryType === "PICKUP") return "Opgehaald";
  if (deliveryType === "HANDOVER") return "Overhandigd";
  return "Verzonden";
}

/** The edition behind a product code, in English for JLC. */
export function editionForJlc(productCode: string) {
  const code = parseProductCode(productCode);
  if (!code) return "";
  if (code.edition === "figure") return "Figure";
  return code.attachment === "key-ring" ? "Keychain (key ring)" : "Keychain (clip)";
}

export type ZipEntry = { path: string; key: string; palleyName: string };
export type ManifestRow = { orderNumber: string; palleyName: string; productCode: string; edition: string; copies: number; fileName: string };

/**
 * The files of a batch zip and the manifest that goes with them, orders by number and Palleys by position. One file
 * per Palley: JLC prints `copies` of it, as the manifest says. Items without a file or a name come back in `missing`.
 */
export function batchContents(
  batchRef: string,
  orders: { number: string; items: BatchItemSource[] }[],
): { entries: ZipEntry[]; manifest: ManifestRow[]; missing: string[] } {
  const entries: ZipEntry[] = [];
  const manifest: ManifestRow[] = [];
  const missing: string[] = [];
  for (const order of [...orders].sort((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }))) {
    for (const item of [...order.items].sort((a, b) => a.position - b.position)) {
      const palleyName = palleyNameOf({ ...item, order });
      const key = printFileKey(item);
      if (!palleyName || !key) {
        missing.push(palleyName ?? `${order.number} lijn ${item.position}`);
        continue;
      }
      const fileName = palleyFileName(palleyName, "print");
      entries.push({ path: batchZipEntry(batchRef, order.number, fileName), key, palleyName });
      manifest.push({ orderNumber: order.number, palleyName, productCode: item.productCode, edition: editionForJlc(item.productCode), copies: item.quantity, fileName });
    }
  }
  return { entries, manifest, missing };
}

export const manifestPath = batchManifestEntry;

/** The manifest as CSV, for JLC: plain ASCII names, comma-separated, one row per Palley. */
export function manifestCsv(rows: ManifestRow[]) {
  const header = ["order", "palley", "product_code", "edition", "copies", "file"];
  const lines = rows.map((row) => [row.orderNumber, row.palleyName, row.productCode, row.edition, String(row.copies), row.fileName]);
  return [header, ...lines].map((line) => line.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

const csvCell = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);
