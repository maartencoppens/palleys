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
import { printFileBaseName } from "@/core/modules/previews/utils";
import { PRINT_FILE_CONTENT_TYPE } from "@/data/uploads";
import type { ProcessingItem, ProcessingOverview } from "./types";
import { isProcessedKeyOf, processedKey } from "./utils";

// Uploaden mag bij een goedgekeurd model (eerste keer) of een verwerkt
// model (vervangen, bv. na een fout in Blender).
const UPLOADABLE_STATUSES: PreviewStatus[] = [
  PreviewStatus.APPROVED,
  PreviewStatus.PRINT_READY,
];

const ITEM_SELECT = {
  id: true,
  shopifyOrderNumber: true,
  animalType: true,
  paidAt: true,
  createdAt: true,
  downloadedAt: true,
  downloadedBy: true,
  processedAt: true,
  processedBy: true,
} as const;

type ItemRow = {
  id: string;
  shopifyOrderNumber: string | null;
  animalType: string | null;
  paidAt: Date | null;
  createdAt: Date;
  downloadedAt: Date | null;
  downloadedBy: string | null;
  processedAt: Date | null;
  processedBy: string | null;
};

function toItem(row: ItemRow): ProcessingItem {
  return {
    id: row.id,
    baseName: printFileBaseName(row),
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
    select: { status: true, processedKey: true },
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

  const fileName = `${printFileBaseName(preview)}-PRINT.zip`;
  const url = await createDownloadUrl(preview.processedKey, fileName);
  return { url, fileName };
}
