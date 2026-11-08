import { api } from "@/core/networking/api";

/* The backoffice's calls for Batches and Productie. Downloads are plain links once the server said yes. */

export async function postCreateBatch(orderIds: string[]) {
  const { data } = await api.post<{ batchId: string; ref: string }>("/admin/batches", { orderIds });
  return data;
}

export async function postAddToBatch(batchId: string, orderIds: string[]) {
  const { data } = await api.post<{ batchId: string }>(`/admin/batches/${batchId}/orders`, { orderIds });
  return data;
}

export async function deleteBatchOrder(batchId: string, orderId: string) {
  const { data } = await api.delete<{ orderId: string }>(`/admin/batches/${batchId}/orders/${orderId}`);
  return data;
}

export async function deleteBatch(batchId: string) {
  const { data } = await api.delete<{ batchId: string }>(`/admin/batches/${batchId}`);
  return data;
}

export type BatchAction = "send_to_jlc" | "received" | "ship_all_deliveries";

export async function postBatchAction(batchId: string, action: BatchAction) {
  const { data } = await api.post<{ shipped?: string[]; blocked?: string[] }>(`/admin/batches/${batchId}/status`, { action });
  return data;
}

// A file the server sends as an attachment: the browser saves it and stays on the page.
function startDownload(path: string) {
  const link = document.createElement("a");
  link.href = path;
  link.download = "";
  link.click();
}

/** Checks that every print file is there; only then is the zip downloaded, so it's never half. */
export async function downloadBatchZip(batchId: string) {
  await api.post<{ fileName: string }>(`/admin/batches/${batchId}/zip`);
  startDownload(`/api/admin/batches/${batchId}/zip`);
}

export function downloadBatchBpost(batchId: string) {
  startDownload(`/api/admin/batches/${batchId}/bpost`);
}

export async function postReadyForPickup(orderId: string) {
  const { data } = await api.post<{ mailed: boolean; alreadyReady: boolean }>(`/admin/orders/${orderId}/pickup-ready`);
  return data;
}

export async function postPickupUpdate(message: { nl: string; en?: string }) {
  const { data } = await api.post<{ sent: string[]; failed: string[] }>("/admin/pickup-updates", { message });
  return data;
}
