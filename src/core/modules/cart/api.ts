import { api } from "@/core/networking/api";
import type { Attachment } from "@/data/options";
import type { AddCollectibleToCartInput, AddToCartInput, CartView } from "./types";

// Client-side wrappers around app/api/cart. The cart token stays in an httpOnly cookie.

export async function fetchCart() {
  const { data } = await api.get<{ cart: CartView | null }>("/cart");
  return data.cart;
}

export async function postAddToCart(input: AddToCartInput) {
  const { data } = await api.post<{ cart: CartView }>("/cart", input);
  return data.cart;
}

export async function postAddCollectibleToCart(input: AddCollectibleToCartInput) {
  const { data } = await api.post<{ cart: CartView }>("/cart", input);
  return data.cart;
}

export async function patchCartLine(lineId: string, quantity: number) {
  const { data } = await api.patch<{ cart: CartView | null }>("/cart", { lineId, quantity });
  return data.cart;
}

export async function patchCartLineAttachment(lineId: string, attachment: Attachment) {
  const { data } = await api.patch<{ cart: CartView | null }>("/cart", { lineId, attachment });
  return data.cart;
}

export async function deleteCartLine(lineId: string) {
  const { data } = await api.delete<{ cart: CartView | null }>("/cart", { data: { lineId } });
  return data.cart;
}
