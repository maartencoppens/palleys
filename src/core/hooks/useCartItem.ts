"use client";
import { useCallback, useEffect, useState } from "react";
import {
  loadCart,
  saveCart,
  type CartItem,
  type StoredCart,
} from "@/core/modules/shopify/cart-storage";
import { UNPAID_UPLOAD_TTL_DAYS } from "@/data/retention";

export function useCartItems() {
  const [cart, setCart] = useState<StoredCart>(() => loadCart());
  const ready = true;

  useEffect(() => {
    if (ready) saveCart(cart);
  }, [cart, ready]);

  const addItem = useCallback((item: CartItem) => {
    setCart((prev) => ({
      ...prev,
      items: [
        ...prev.items.filter((i) => i.previewId !== item.previewId),
        item,
      ],
    }));
  }, []);

  const removeItem = useCallback((previewId: string) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.previewId !== previewId),
    }));
  }, []);

  const setCartId = useCallback((cartId: string) => {
    setCart((prev) => ({ ...prev, cartId }));
  }, []);

  const clear = useCallback(() => setCart({ items: [] }), []);

  return {
    items: cart.items,
    cartId: cart.cartId,
    ready,
    addItem,
    removeItem,
    setCartId,
    clear,
    retentionDays: UNPAID_UPLOAD_TTL_DAYS,
  };
}
