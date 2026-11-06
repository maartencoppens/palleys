import "server-only";

/**
 * The visitor's IP, for rate limits. Everything in x-forwarded-for can be sent by the visitor themself; only the last
 * entry was added by our own reverse proxy. Reading the first one would let anyone dodge every limit with a made-up header.
 */
export function getClientIp(headers: Headers): string | null {
  return headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || null;
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
