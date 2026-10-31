import "server-only";
import { cookies } from "next/headers";
import { CART_COOKIE, CART_TTL_MS } from "@/data/checkout";

// The cart token lives in an httpOnly cookie: scripts on the page can't read it.

export async function readCartToken() {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

export async function writeCartToken(token: string) {
  (await cookies()).set(CART_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(CART_TTL_MS / 1000),
  });
}

export async function clearCartToken() {
  (await cookies()).delete(CART_COOKIE);
}
