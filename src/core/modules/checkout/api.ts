import { api } from "@/core/networking/api";
import type { CheckoutConfig, CheckoutResult, DeliveryOptionView } from "./types";

// Client-side wrappers around app/api/checkout. Only details and choices go out, never amounts.

export async function fetchCheckoutConfig() {
  const { data } = await api.get<CheckoutConfig>("/checkout");
  return data;
}

export async function postDeliveryOptions(address: { country: string; postalCode: string }) {
  const { data } = await api.post<{ options: DeliveryOptionView[] }>("/checkout/delivery-options", address);
  return data.options;
}

export async function postCheckout(input: Record<string, unknown>) {
  const { data } = await api.post<CheckoutResult>("/checkout", input);
  return data;
}
