import "server-only";
import { createHmac } from "node:crypto";
import { prisma } from "@/db/client";
import { RATE_LIMITS } from "@/data/checkout";
import { getClientIp } from "./request";

/*
 * Fixed-window rate limit per IP and route, kept in Postgres so it holds across restarts and instances.
 * The IP is never stored: the key is an HMAC with a server secret (GDPR, and plain hashes of IPv4 are reversible).
 * Rows older than their window are cleaned up by the cron job (deleteExpiredRateLimits).
 */
export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Too many requests");
  }
}

export type RateLimitName = keyof typeof RATE_LIMITS;

// Any long server-only secret works as HMAC key; BETTER_AUTH_SECRETS is always set and never leaves the server.
function hmacKey() {
  const secret = process.env.BETTER_AUTH_SECRETS;
  if (!secret) throw new Error("BETTER_AUTH_SECRETS is required for rate limiting");
  return secret;
}

export async function assertRateLimit(name: RateLimitName, headers: Headers) {
  await assertRateLimitFor(name, getClientIp(headers) ?? "unknown");
}

/** The same limit on something other than the IP, e.g. an order number. The subject is hashed like an IP. */
export async function assertRateLimitFor(name: RateLimitName, subject: string) {
  const { max, windowMs } = RATE_LIMITS[name];
  const key = `${name}:${createHmac("sha256", hmacKey()).update(subject).digest("hex").slice(0, 32)}`;
  const now = new Date();
  const windowStartAfter = new Date(now.getTime() - windowMs);

  // One atomic statement: start a new window when the old one is over, otherwise count up.
  const [row] = await prisma.$queryRaw<{ count: number; windowStart: Date }[]>`
    INSERT INTO "RequestLimit" ("key", "count", "windowStart") VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RequestLimit"."windowStart" <= ${windowStartAfter} THEN 1 ELSE "RequestLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RequestLimit"."windowStart" <= ${windowStartAfter} THEN ${now} ELSE "RequestLimit"."windowStart" END
    RETURNING "count", "windowStart"`;

  if (row.count > max) {
    const retryAfterMs = row.windowStart.getTime() + windowMs - now.getTime();
    throw new RateLimitError(Math.max(1, Math.ceil(retryAfterMs / 1000)));
  }
}

export async function deleteExpiredRateLimits() {
  const longestWindow = Math.max(...Object.values(RATE_LIMITS).map((limit) => limit.windowMs));
  const { count } = await prisma.requestLimit.deleteMany({
    where: { windowStart: { lt: new Date(Date.now() - longestWindow) } },
  });
  return count;
}
