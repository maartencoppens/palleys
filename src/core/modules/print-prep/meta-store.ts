import "server-only";
import { getObject } from "@/core/networking/external/storage-client";
import { readModelMeta, type ModelMeta } from "./model-meta";

/** Reads a print zip in R2. Null when it can't be read: an upload never fails on this. */
export async function readStoredModelMeta(key: string): Promise<ModelMeta | null> {
  try {
    return readModelMeta(await getObject(key));
  } catch (error) {
    console.warn(`[model-meta] could not read ${key}:`, error instanceof Error ? error.message : error);
    return null;
  }
}
