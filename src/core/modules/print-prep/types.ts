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
  baseName: string; // PAL-..., zelfde naam als de download uit Goedgekeurd
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
