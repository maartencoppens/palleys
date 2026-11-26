import { api } from "@/core/networking/api";

export async function deleteSubscriber(id: string) {
  const { data } = await api.delete<{ id: string }>(`/admin/newsletter/${id}`);
  return data;
}

export type SyncSummary = Record<"created" | "resubscribed" | "unsubscribed" | "unsubscribedHere" | "unchanged" | "skipped" | "failed", number>;

export async function syncWithResend() {
  const { data } = await api.post<SyncSummary>("/admin/newsletter/sync");
  return data;
}
