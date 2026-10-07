import { api } from "@/core/networking/api";

export async function postApprovePreview(previewId: string) {
  const { data } = await api.post<{ previewId: string; status: string }>(
    `/admin/previews/${previewId}/approve`,
  );
  return data;
}

export function generatePose(id: string) {
  return api.post<{ id: string; status: string }>(
    `/admin/previews/${id}/generate-pose`,
    undefined,
    { timeout: 180_000 },
  );
}
