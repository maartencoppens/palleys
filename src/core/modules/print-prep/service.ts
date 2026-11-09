import "server-only";
import { prisma, PreviewStatus } from "@/db/client";
import {
  createDownloadUrl,
  createUploadUrl,
  deleteObject,
  objectExists,
} from "@/core/networking/external/storage-client";
import {
  PreviewConflictError,
  PreviewNotFoundError,
} from "@/core/modules/previews/service";
import { assertTransition } from "@/core/modules/previews/status";
import { PRINT_NAME_SELECT, printBaseName, type PrintNameSource } from "@/core/modules/previews/utils";
import { palleyNameOf } from "@/core/modules/orders/utils";
import { palleyFileName } from "@/core/utils/naming";
import { PRINT_FILE_CONTENT_TYPE } from "@/data/uploads";
import { OPEN_ORDER_STATUSES } from "@/core/modules/orders/check-in";
import { attachPreviewModel } from "@/core/modules/collectibles/service";
import type { CollectiblePrintItem, ProcessingItem, ProcessingOverview } from "./types";
import { isProcessedKeyOf, processedKey } from "./utils";

// Uploaden mag bij een goedgekeurd model (eerste keer) of een verwerkt
// model (vervangen, bv. na een fout in Blender).
const UPLOADABLE_STATUSES: PreviewStatus[] = [
  PreviewStatus.APPROVED,
  PreviewStatus.PRINT_READY,
];

const ITEM_SELECT = {
  ...PRINT_NAME_SELECT,
  quantity: true,
  downloadedAt: true,
  downloadedBy: true,
  processedAt: true,
  processedBy: true,
} as const;

type ItemRow = PrintNameSource & {
  quantity: number;
  downloadedAt: Date | null;
  downloadedBy: string | null;
  processedAt: Date | null;
  processedBy: string | null;
};

function toItem(row: ItemRow): ProcessingItem {
  return {
    id: row.id,
    baseName: printBaseName(row),
    quantity: row.quantity,
    downloadedAt: row.downloadedAt?.toISOString() ?? null,
    downloadedBy: row.downloadedBy,
    processedAt: row.processedAt?.toISOString() ?? null,
    processedBy: row.processedBy,
  };
}

// Alles voor de Processed-pagina in één aanroep.
export async function getProcessingOverview(): Promise<ProcessingOverview> {
  const [inProgress, printReady] = await Promise.all([
    // Gedownload uit Goedgekeurd = ligt in Blender.
    prisma.preview.findMany({
      where: { status: PreviewStatus.APPROVED, downloadedAt: { not: null } },
      orderBy: { downloadedAt: "asc" },
      select: ITEM_SELECT,
    }),
    prisma.preview.findMany({
      where: { status: PreviewStatus.PRINT_READY, processedKey: { not: null } },
      orderBy: { processedAt: "desc" },
      select: ITEM_SELECT,
    }),
  ]);
  return { inProgress: inProgress.map(toItem), printReady: printReady.map(toItem) };
}

async function getUploadablePreview(id: string) {
  const preview = await prisma.preview.findUnique({
    where: { id },
    select: { status: true, processedKey: true, forCollectible: true },
  });
  if (!preview) throw new PreviewNotFoundError(id);
  if (!UPLOADABLE_STATUSES.includes(preview.status)) {
    throw new PreviewConflictError("Alleen goedgekeurde modellen");
  }
  return preview;
}

// Stap 1: signed upload-URL, nog niets in de database.
export async function createProcessedUpload(id: string) {
  await getUploadablePreview(id);
  const key = processedKey(id);
  const uploadUrl = await createUploadUrl(key, PRINT_FILE_CONTENT_TYPE);
  return { key, uploadUrl };
}

// Stap 2: het bestand staat in R2. Opslaan, status naar PRINT_READY en een
// eventueel vorig verwerkt bestand opruimen.
export async function confirmProcessedUpload(
  id: string,
  key: string,
  adminName: string,
) {
  if (!isProcessedKeyOf(id, key)) {
    throw new PreviewConflictError("Ongeldige key");
  }
  const preview = await getUploadablePreview(id);
  if (preview.status === PreviewStatus.APPROVED) {
    assertTransition(preview.status, PreviewStatus.PRINT_READY);
  }
  if (!(await objectExists(key))) {
    throw new PreviewConflictError("Upload niet gevonden, probeer opnieuw");
  }

  const { count } = await prisma.preview.updateMany({
    where: { id, status: preview.status }, // niemand anders was ons voor
    data: {
      status: PreviewStatus.PRINT_READY,
      processedKey: key,
      processedAt: new Date(),
      processedBy: adminName,
    },
  });
  if (count === 0) throw new PreviewConflictError("Status is intussen gewijzigd");

  // A new collectible's model goes straight onto its collectible. If that fails, the preview page offers to retry.
  if (preview.forCollectible) {
    await attachPreviewModel(id, adminName).catch((err) => console.error(`[print-prep] model of ${id} not attached:`, err));
  }

  if (preview.processedKey && preview.processedKey !== key) {
    try {
      await deleteObject(preview.processedKey);
    } catch (err) {
      console.error(`Could not delete ${preview.processedKey}:`, err);
    }
  }
  return { previewId: id, status: PreviewStatus.PRINT_READY };
}

// Verse signed URL per klik: een link die bij het laden van de pagina
// gemaakt is, zou na 5 minuten al verlopen zijn.
export async function getProcessedDownloadUrl(id: string) {
  const preview = await prisma.preview.findUnique({
    where: { id },
    select: { ...ITEM_SELECT, processedKey: true },
  });
  if (!preview) throw new PreviewNotFoundError(id);
  if (!preview.processedKey) {
    throw new PreviewConflictError("Nog geen verwerkt bestand");
  }

  const fileName = palleyFileName(printBaseName(preview), "print");
  const url = await createDownloadUrl(preview.processedKey, fileName);
  return { url, fileName };
}

/** Collectibles on open orders that nobody ticked off yet, oldest order first. */
export async function getCollectiblePrintQueue(): Promise<CollectiblePrintItem[]> {
  const items = await prisma.orderItem.findMany({
    where: { collectibleId: { not: null }, checkedInAt: null, order: { status: { in: OPEN_ORDER_STATUSES } } },
    orderBy: { order: { paidAt: "asc" } },
    select: {
      id: true,
      position: true,
      productCode: true,
      reprintNr: true,
      quantity: true,
      attachment: true,
      title: true,
      collectible: { select: { id: true, modelKey: true } },
      order: { select: { id: true, number: true, paidAt: true, reprintOf: { select: { number: true } } } },
    },
  });
  return items.flatMap((item) =>
    item.collectible
      ? {
          itemId: item.id,
          orderId: item.order.id,
          orderNumber: item.order.number,
          palleyName: palleyNameOf(item),
          collectibleId: item.collectible.id,
          name: item.title,
          quantity: item.quantity,
          attachment: item.attachment,
          hasModel: item.collectible.modelKey !== null,
          paidAt: item.order.paidAt?.toISOString() ?? null,
        }
      : [],
  );
}
