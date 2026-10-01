import { api } from "@/core/networking/api";

export async function postApprovePreview(previewId: string) {
  const { data } = await api.post<{ previewId: string; status: string }>(
    `/admin/previews/${previewId}/approve`,
  );
  return data;
}
