import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sendcloud signs every webhook: `Sendcloud-Signature` is the hex HMAC-SHA256 of the exact raw body, with the API
 * integration's secret (sendcloud.dev/api/v3/webhooks). Compared in constant time.
 */
export function isValidSendcloudSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
