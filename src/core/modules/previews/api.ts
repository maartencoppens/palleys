import { api } from "@/core/networking/api";
import axios from "axios";
import type { PreviewStatus } from "@/db/client";
import type { PreviewActionResult, PrintDownload } from "./types";
import { ALLOWED_IMAGE_TYPES, type ImageMimeType } from "@/data/uploads";

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
  animalType: string,
) {
  const { data } = await api.post<{
    previewId: string;
    animalType: string;
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

// ---------- Customer upload (public, /create) ----------

const EXTENSION_TYPES: Record<string, ImageMimeType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

// Some browsers leave file.type empty; fall back to the extension so R2 gets a proper content type.
function contentTypeOf(file: File): ImageMimeType {
  if ((ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return file.type as ImageMimeType;
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const type = EXTENSION_TYPES[extension];
  if (!type) throw new Error(`Unsupported photo type: ${file.name}`);
  return type;
}

/**
 * Creates an unpaid preview and uploads the photos straight to R2 via signed URLs.
 * The photos never pass through our server; the cart checks afterwards that they arrived.
 */
export async function uploadCustomerPhotos(files: File[]) {
  const photos = files.map((file) => ({ contentType: contentTypeOf(file), size: file.size }));
  const { data } = await api.post<{ previewId: string; uploadUrls: string[]; expiresAt: string }>(
    "/uploads",
    { photos },
  );
  // Plain axios, not the api instance: this goes to R2, not to /api.
  await Promise.all(
    files.map((file, index) =>
      axios.put(data.uploadUrls[index], file, {
        headers: { "Content-Type": photos[index].contentType },
      }),
    ),
  );
  return { previewId: data.previewId, expiresAt: data.expiresAt };
}

export async function putPromptOverride(previewId: string, prompt: string) {
  await api.put(`/admin/previews/${previewId}/prompt`, { prompt });
}

export async function uploadPose(previewId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  await api.post(`/admin/previews/${previewId}/pose`, form, { headers: { "Content-Type": "multipart/form-data" } });
}

export async function postApprovePoseCandidate(previewId: string, candidateId: string) {
  const { data } = await api.post<PreviewActionResult>(`/admin/previews/${previewId}/pose-candidates/${candidateId}/approve`);
  return data;
}
