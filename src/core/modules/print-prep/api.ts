import axios from "axios";
import { api } from "@/core/networking/api";
import { PRINT_FILE_CONTENT_TYPE } from "@/data/uploads";

// Upload in drie stappen: signed URL vragen, rechtstreeks naar R2, bevestigen.
export async function uploadProcessedFile(previewId: string, file: File) {
  const { data } = await api.post<{ key: string; uploadUrl: string }>(
    `/admin/print-prep/${previewId}/upload`,
    { size: file.size },
  );
  // Gewone axios, niet de api-instance: dit gaat naar R2, niet naar /api.
  // Altijd application/zip: Windows noemt een zip soms anders, en de
  // Content-Type moet exact overeenkomen met die in de signed URL.
  await axios.put(data.uploadUrl, file, {
    headers: { "Content-Type": PRINT_FILE_CONTENT_TYPE },
  });
  await api.post(`/admin/print-prep/${previewId}/confirm`, { key: data.key });
}

export async function getProcessedDownload(previewId: string) {
  const { data } = await api.post<{ url: string; fileName: string }>(
    `/admin/print-prep/${previewId}/download`,
  );
  return data;
}
