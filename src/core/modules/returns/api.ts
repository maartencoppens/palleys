import axios from "axios";
import { api } from "@/core/networking/api";
import type { ReturnOverview, ReturnPhotoUploadInput, ReturnReceipt, ReturnSubmitRequest } from "./types";

// ---------- Customer ----------

export async function postReturnLookup(input: { orderNumber: string; email: string; locale: string }) {
  await api.post("/returns/lookup", input);
}

export async function postReturnSession(token: string, locale: string) {
  const { data } = await api.post<ReturnOverview>("/returns/session", { token }, { params: { locale } });
  return data;
}

export async function fetchReturnOverview(locale: string) {
  const { data } = await api.get<ReturnOverview>("/returns", { params: { locale } });
  return data;
}

/** Uploads a warranty claim's photos straight to R2 via signed URLs; gives back their keys. */
export async function uploadReturnPhotos(files: File[], contentTypes: ReturnPhotoUploadInput["photos"][number]["contentType"][]) {
  const photos = files.map((file, index) => ({ contentType: contentTypes[index], size: file.size }));
  const { data } = await api.post<{ uploads: { key: string; uploadUrl: string }[] }>("/returns/photos", { photos });
  // Plain axios, not the api instance: this goes to R2, not to /api.
  await Promise.all(
    files.map((file, index) => axios.put(data.uploads[index].uploadUrl, file, { headers: { "Content-Type": photos[index].contentType } })),
  );
  return data.uploads.map((upload) => upload.key);
}

export async function postReturnRequest(input: ReturnSubmitRequest, locale: string) {
  const { data } = await api.post<ReturnReceipt>("/returns", input, { params: { locale } });
  return data;
}

// ---------- Admin ----------

export async function postReturnDecision(id: string, input: { action: "approve" | "complete" } | { action: "reject"; note: string }) {
  const { data } = await api.post<{ id: string; status: string; reprintOrder: { id: string; number: string } | null }>(
    `/admin/returns/${id}`,
    input,
  );
  return data;
}

export async function putDeliveredOn(orderId: string, deliveredOn: string | null) {
  const { data } = await api.put<{ deliveredOn: string | null }>(`/admin/orders/${orderId}/delivered`, { deliveredOn });
  return data;
}
