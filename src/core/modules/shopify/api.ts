import { api } from "@/core/networking/api";
import type { AddToCartInput, CartView } from "./types";

// Client-side wrappers around app/api/cart. The cart ID stays in an httpOnly cookie.

export async function fetchCart() {
  const { data } = await api.get<{ cart: CartView | null }>("/cart");
  return data.cart;
}

export async function postAddToCart(input: AddToCartInput) {
  const { data } = await api.post<{ cart: CartView }>("/cart", input);
  return data.cart;
}

export async function deleteCartLine(lineId: string) {
  const { data } = await api.delete<{ cart: CartView | null }>("/cart", { data: { lineId } });
  return data.cart;
}
