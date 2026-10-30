"use client";
import { useSyncExternalStore } from "react";
import { fetchCart } from "@/core/modules/shopify/api";
import type { CartView } from "@/core/modules/shopify/types";

/*
 * The last cart the browser saw, shared between the navbar's mini cart, the cart page and the
 * configurator. It only mirrors what the cart API returns; every change still goes through that API.
 * `revealedAt` changes when something was just added, so the navbar can open the mini cart.
 */
type Snapshot = { cart: CartView | null; loaded: boolean; revealedAt: number };

const serverSnapshot: Snapshot = { cart: null, loaded: false, revealedAt: 0 };
let snapshot = serverSnapshot;
let request: Promise<CartView | null> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publishCart(cart: CartView | null, { reveal = false } = {}) {
  snapshot = {
    cart,
    loaded: true,
    revealedAt: reveal ? Date.now() : snapshot.revealedAt,
  };
  listeners.forEach((listener) => listener());
}

/** Fetches the cart once, even when several components ask for it at the same time. */
export function loadCart() {
  request ??= fetchCart()
    .then((cart) => {
      publishCart(cart);
      return cart;
    })
    .finally(() => {
      request = null;
    });
  return request;
}

export function useCartSnapshot() {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => serverSnapshot,
  );
}
