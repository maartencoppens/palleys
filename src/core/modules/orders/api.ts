import { api } from "@/core/networking/api";
import type { OrderStatusView } from "@/core/modules/checkout/types";

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
