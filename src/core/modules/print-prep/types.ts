import { z } from "zod";
import { MAX_PRINT_FILE_BYTES } from "@/data/uploads";

export const printFileUploadSchema = z.object({
  size: z.number().int().positive().max(MAX_PRINT_FILE_BYTES),
});

export const confirmPrintFileSchema = z.object({
  key: z.string().min(1).max(300),
});

export type ProcessingItem = {
  id: string;
  baseName: string; // PAL-PLY1042-01-P-RING-KAT (of PRV-..., COL-...), zelfde naam als de download uit Goedgekeurd
  quantity: number; // aantal exemplaren om te printen
  downloadedAt: string | null;
  downloadedBy: string | null;
  processedAt: string | null;
  processedBy: string | null;
};

export type ProcessingOverview = {
  inProgress: ProcessingItem[]; // gedownload, wacht op de zip uit Blender
  printReady: ProcessingItem[]; // zip geüpload, klaar voor print
};

/** A collectible on a paid, open order that still has to be printed: from its own stored model. */
export type CollectiblePrintItem = {
  itemId: string;
  orderId: string;
  orderNumber: string;
  /** PAL-PLY1042-02-COL-CLP-007; null for a line from before the naming standard. */
  palleyName: string | null;
  collectibleId: string;
  name: string;
  quantity: number;
  attachment: string | null;
  hasModel: boolean;
  paidAt: string | null;
};
