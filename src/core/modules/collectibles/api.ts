import axios from "axios";
import { api } from "@/core/networking/api";
import { PRINT_FILE_CONTENT_TYPE } from "@/data/uploads";
import type { CollectibleInput, GenerateCollectibleInput } from "./types";

export async function postCollectible(input: CollectibleInput) {
  const { data } = await api.post<{ id: string }>("/admin/collectibles", input);
  return data;
}

export async function putCollectible(id: string, input: CollectibleInput) {
  const { data } = await api.put<{ id: string }>(`/admin/collectibles/${id}`, input);
  return data;
}

export async function deleteCollectible(id: string) {
  const { data } = await api.delete<{ id: string }>(`/admin/collectibles/${id}`);
  return data;
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

export async function getCollectibleModelDownload(id: string) {
  const { data } = await api.post<{ url: string; fileName: string }>(`/admin/collectibles/${id}/model`);
  return data;
}

/** Opens a signed download in the browser. */
export async function downloadCollectibleModel(id: string) {
  const { url, fileName } = await getCollectibleModelDownload(id);
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
