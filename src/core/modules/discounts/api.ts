import { api } from "@/core/networking/api";
import type { AppliedDiscount, DiscountInput } from "./types";

export async function postDiscount(input: DiscountInput) {
  const { data } = await api.post<{ id: string }>("/admin/discounts", input);
  return data;
}

export async function putDiscount(id: string, input: DiscountInput) {
  const { data } = await api.put<{ id: string }>(`/admin/discounts/${id}`, input);
  return data;
}

export async function deleteDiscountCode(id: string) {
  const { data } = await api.delete<{ id: string }>(`/admin/discounts/${id}`);
  return data;
}

/** Checks a code against the current cart. The amount comes from the server and is worked out again at checkout. */
export async function postApplyDiscount(code: string) {
  const { data } = await api.post<AppliedDiscount>("/checkout/discount", { code });
  return data;
}
