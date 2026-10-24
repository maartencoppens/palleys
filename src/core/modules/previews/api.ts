import { api } from "@/core/networking/api";
import type { AnimalType } from "@/data/animals";
import axios from "axios";
import type { PreviewStatus } from "@/db/client";
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
// Admin-upload in drie stappen: signed URL vragen, rechtstreeks naar R2
// uploaden, en dan bevestigen zodat de server de foto pas dan opslaat.
export async function uploadAdminPhoto(previewId: string, file: File) {
  const { data } = await api.post<{ key: string; uploadUrl: string }>(
    `/admin/previews/${previewId}/photos`,
    { contentType: file.type, size: file.size },
  );
  // Gewone axios, niet de api-instance: dit gaat naar R2, niet naar /api.
  await axios.put(data.uploadUrl, file, {
    headers: { "Content-Type": file.type },
  });
  await api.post(`/admin/previews/${previewId}/photos/confirm`, {
    key: data.key,
  });
}

export async function deleteAdminPhoto(previewId: string, photoId: string) {
  await api.delete(`/admin/previews/${previewId}/photos/${photoId}`);
}

export async function postStatusOverride(
  previewId: string,
  status: PreviewStatus,
  reason: string,
) {
  const { data } = await api.post<PreviewActionResult>(
    `/admin/previews/${previewId}/status`,
    { status, reason },
  );
  return data;
}
