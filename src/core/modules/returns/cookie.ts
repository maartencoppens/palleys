import "server-only";
import { cookies } from "next/headers";
import { RETURN_SESSION_COOKIE, RETURN_SESSION_COOKIE_PATH, RETURN_SESSION_TTL_MS } from "@/data/returns";

// The return session lives in an httpOnly cookie that only the returns API receives; the database has its hash.

export async function readReturnSession() {
  return (await cookies()).get(RETURN_SESSION_COOKIE)?.value ?? null;
}

export async function writeReturnSession(token: string) {
  (await cookies()).set(RETURN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: RETURN_SESSION_COOKIE_PATH,
    maxAge: Math.floor(RETURN_SESSION_TTL_MS / 1000),
  });
}

export async function clearReturnSession() {
  (await cookies()).delete({ name: RETURN_SESSION_COOKIE, path: RETURN_SESSION_COOKIE_PATH });
}
