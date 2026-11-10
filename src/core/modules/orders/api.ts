import { api } from "@/core/networking/api";
import type { OrderStatusView } from "@/core/modules/checkout/types";
import type { AdminOrderDetail, ManualOrderRequest, ManualOrderResult, OrderStatusActionInput } from "./types";

export async function fetchOrderStatus(orderId: string, token: string) {
  const { data } = await api.get<OrderStatusView>(`/orders/${encodeURIComponent(orderId)}/status`, {
    params: { t: token },
  });
  return data;
}

export async function postSyncOrderPayment(orderId: string) {
  const { data } = await api.post<{ status: string }>(`/admin/orders/${orderId}/sync`);
  return data;
}

export async function postResendConfirmation(orderId: string) {
  const { data } = await api.post<{ sent: boolean }>(`/admin/orders/${orderId}/resend-confirmation`);
  return data;
}

export async function postResolveAttention(orderId: string, note: string) {
  const { data } = await api.post<{ orderId: string }>(`/admin/orders/${orderId}/resolve`, { note });
  return data;
}

export async function postManualOrder(input: ManualOrderRequest) {
  const { data } = await api.post<ManualOrderResult>("/admin/orders", input);
  return data;
}

export async function postOrderStatus(orderId: string, input: OrderStatusActionInput) {
  const { data } = await api.post<{ status: string }>(`/admin/orders/${orderId}/status`, input);
  return data;
}

export async function postItemCheckIn(orderId: string, itemId: string, checked: boolean) {
  const { data } = await api.post<{ checked: boolean }>(`/admin/orders/${orderId}/items/${itemId}/check-in`, { checked });
  return data;
}

export async function postManualPayment(orderId: string, method: string, sendConfirmation: boolean) {
  const { data } = await api.post<{ orderId: string }>(`/admin/orders/${orderId}/payment`, {
    type: "paid",
    method,
    sendConfirmation,
  });
  return data;
}

export async function postPaymentLink(orderId: string) {
  const { data } = await api.post<{ checkoutUrl: string }>(`/admin/orders/${orderId}/payment`, { type: "bancontact" });
  return data;
}

export async function patchOrderDetails(orderId: string, input: Record<string, unknown>) {
  const { data } = await api.patch<{ changed: string[] }>(`/admin/orders/${orderId}`, input);
  return data;
}

export async function deleteOrderForGood(orderId: string, input: { confirmNumber: string; reason: string; confirmPaid: boolean }) {
  const { data } = await api.delete<{ number: string }>(`/admin/orders/${orderId}`, { data: input });
  return data;
}

export async function deletePhotoConsent(orderId: string) {
  const { data } = await api.delete<{ orderId: string }>(`/admin/orders/${orderId}/photo-consent`);
  return data;
}

export async function putOrderNotes(orderId: string, notes: string) {
  const { data } = await api.put<AdminOrderDetail["adminNotes"]>(`/admin/orders/${orderId}/notes`, { notes });
  return data;
}
