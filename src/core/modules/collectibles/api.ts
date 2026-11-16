import axios from "axios";
import { api } from "@/core/networking/api";
import { PRINT_FILE_CONTENT_TYPE } from "@/data/uploads";
import type { CollectibleGeneration, CollectibleInput, CollectibleModelVersion, GenerateCollectibleInput } from "./types";

type CollectibleBody = Omit<CollectibleInput, "modelKey" | "modelFileName"> & { modelKey?: string | null; modelFileName?: string | null };

export async function postCollectible(input: CollectibleBody) {
  const { data } = await api.post<{ id: string }>("/admin/collectibles", input);
  return data;
}

export async function putCollectible(id: string, input: CollectibleBody) {
  const { data } = await api.put<{ id: string }>(`/admin/collectibles/${id}`, input);
  return data;
}

export async function deleteCollectible(id: string, permanent = false) {
  const { data } = await api.delete<{ id: string }>(`/admin/collectibles/${id}`, { params: permanent ? { permanent: 1 } : undefined });
  return data;
}

export async function fetchCollectibleModels(id: string) {
  const { data } = await api.get<{ versions: CollectibleModelVersion[]; generations: CollectibleGeneration[] }>(`/admin/collectibles/${id}/models`);
  return data;
}

/** Uploads a zip straight to R2 and adds it as a version of the collectible. */
export async function uploadCollectibleModelVersion(id: string, file: File, activate: boolean) {
  const { modelKey, modelFileName } = await uploadCollectibleModel(file);
  const { data } = await api.post<{ id: string }>(`/admin/collectibles/${id}/models`, { modelKey, modelFileName, activate });
  return data;
}

export async function putActiveCollectibleModel(id: string, modelId: string) {
  await api.put(`/admin/collectibles/${id}/models/${modelId}`);
}

export async function deleteCollectibleModelVersion(id: string, modelId: string) {
  await api.delete(`/admin/collectibles/${id}/models/${modelId}`);
}

export async function postRestoreCollectible(id: string) {
  const { data } = await api.post<{ id: string }>(`/admin/collectibles/${id}/restore`);
  return data;
}

export async function uploadCollectibleImage(file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<{ imageKey: string; imageUrl: string }>("/admin/collectibles/images", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

/** Straight to R2 with a signed URL; the key goes along when the collectible is saved. */
export async function uploadCollectibleModel(file: File) {
  const { data } = await api.post<{ key: string; uploadUrl: string }>("/admin/collectibles/models", { size: file.size });
  // Plain axios, not the api instance: this goes to R2. Always application/zip, as signed.
  await axios.put(data.uploadUrl, file, { headers: { "Content-Type": PRINT_FILE_CONTENT_TYPE } });
  return { modelKey: data.key, modelFileName: file.name };
}

export async function getCollectibleModelDownload(id: string, modelId?: string) {
  const { data } = await api.post<{ url: string; fileName: string }>(`/admin/collectibles/${id}/model`, modelId ? { modelId } : {});
  return data;
}

/** Opens a signed download in the browser: the model in use, or one version. */
export async function downloadCollectibleModel(id: string, modelId?: string) {
  const { url, fileName } = await getCollectibleModelDownload(id, modelId);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
}

export async function postAttachPreviewModel(previewId: string) {
  const { data } = await api.post<{ id: string }>(`/admin/previews/${previewId}/collectible`);
  return data;
}

export async function postGenerateCollectible(input: GenerateCollectibleInput) {
  const { data } = await api.post<{ previewId: string; collectibleId: string }>("/admin/collectibles/generate", input);
  return data;
}

export async function postRefreshCollectibleModelMeta(id: string, modelId: string) {
  await api.post(`/admin/collectibles/${id}/models/${modelId}`);
}
