import "server-only";

/** The visitor's IP as seen by our host (Vercel sets x-forwarded-for / x-real-ip). */
export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || null;
}

export class CrossOriginError extends Error {}

/**
 * Refuses state-changing requests sent from another site. Browsers always send Origin on cross-site POSTs; the
 * cookies are SameSite=Lax as well, this is the second lock on the door.
 */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return; // same-origin fetches from some browsers, and server-to-server calls
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    if (new URL(origin).host === host) return;
  } catch {
    // fall through
  }
  throw new CrossOriginError();
}
