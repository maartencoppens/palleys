import { api } from "@/core/networking/api";
import type { AnimalType } from "@/data/animals";
import type { PreviewActionResult, PrintDownload } from "./types";

export async function postApprovePreview(previewId: string) {
  const { data } = await api.post<PreviewActionResult>(
    `/admin/previews/${previewId}/approve`,
  );
  return data;
}

export async function postGeneratePose(previewId: string) {
  const { data } = await api.post<PreviewActionResult>(
    `/admin/previews/${previewId}/generate-pose`,
    undefined,
    { timeout: 180_000 },
  );
  return data;
}

export async function postGenerateModel(previewId: string) {
  const { data } = await api.post<PreviewActionResult>(
    `/admin/previews/${previewId}/generate-model`,
  );
  return data;
}

export async function postSyncModel(previewId: string) {
  const { data } = await api.post<PreviewActionResult>(
    `/admin/previews/${previewId}/sync-model`,
    undefined,
    { timeout: 120_000 },
  );
  return data;
}

export async function postDownloadModels(previewIds: string[]) {
  const { data } = await api.post<{ downloads: PrintDownload[] }>(
    "/admin/previews/download",
    { previewIds },
  );
  return data.downloads;
}

export async function postAnimalType(
  previewId: string,
  animalType: AnimalType,
) {
  const { data } = await api.post<{
    previewId: string;
    animalType: AnimalType;
  }>(`/admin/previews/${previewId}/animal-type`, { animalType });
  return data;
}
