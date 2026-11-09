import { api } from "@/core/networking/api";

export async function deleteSubscriber(id: string) {
  const { data } = await api.delete<{ id: string }>(`/admin/newsletter/${id}`);
  return data;
}
