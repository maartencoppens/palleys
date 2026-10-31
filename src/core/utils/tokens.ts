import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/*
 * Unguessable tokens for links and cookies (cart, order return page). Only the SHA-256 hash is stored, so a
 * database leak doesn't hand out working links. 32 random bytes = 256 bits, no need for a slow hash.
 */
export function createToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Constant-time check of a token against a stored hash. */
export function tokenMatches(token: string | null | undefined, storedHash: string) {
  if (!token || token.length > 128) return false;
  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Constant-time comparison of two secrets, e.g. a bearer token against CRON_SECRET. */
export function secretsMatch(received: string | null | undefined, expected: string) {
  if (!received) return false;
  const a = createHash("sha256").update(received).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
