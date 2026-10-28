import "server-only";

/** The visitor's IP as seen by our host (Vercel sets x-forwarded-for / x-real-ip). */
export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || null;
}
