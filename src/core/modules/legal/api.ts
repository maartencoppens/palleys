import { api } from "@/core/networking/api";
import type { LegalDocumentSlug, LegalVersion, LocalizedLegalContent } from "./types";

export async function publishLegal<D extends LegalDocumentSlug>(document: D, content: LocalizedLegalContent<D>) {
  const { data } = await api.post<{ version: LegalVersion<D> }>(`/admin/legal/${document}`, { content });
  return data.version;
}

export async function fetchLegalVersion<D extends LegalDocumentSlug>(document: D, version: string) {
  const { data } = await api.get<{ version: LegalVersion<D> }>(`/admin/legal/${document}`, { params: { version } });
  return data.version;
}
