import { api } from "@/core/networking/api";
import type { CollectibleInput } from "./types";

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
