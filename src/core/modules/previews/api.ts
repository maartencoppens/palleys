import { api } from "@/core/networking/api";
import type { PreviewActionResult } from "./types";

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
