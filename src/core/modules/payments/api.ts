import { api } from "@/core/networking/api";
import type { PaymentMethodOverview, ToggleRequest } from "./method-rules";

export async function putPaymentMethod(input: ToggleRequest) {
  const { data } = await api.put<{ overview: PaymentMethodOverview }>("/admin/settings/payment-methods", input);
  return data.overview;
}
