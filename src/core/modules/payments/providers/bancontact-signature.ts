import { createPublicKey, verify, type JsonWebKey } from "node:crypto";

/*
 * Verifies Bancontact Pro callback signatures (pure, no network, so it can be unit tested).
 * The `signature` header is a detached JWS (RFC 7515 + 7797): base64url(header) + ".." + base64url(signature),
 * signed over base64url(header) + "." + base64url(raw request body). The docs say ES256; Bancontact's JWKS also
 * holds RS256 keys, so both are accepted, but only with a key of the matching type and algorithm. The header carries critical claims
 * we check too: the payment profile (sub), the issuer, the time and the path it was sent to.
 */

export type Jwk = JsonWebKey & { kid?: string };

const CLAIM = {
  sub: "https://payconiq.com/sub",
  iss: "https://payconiq.com/iss",
  iat: "https://payconiq.com/iat",
  jti: "https://payconiq.com/jti",
  path: "https://payconiq.com/path",
} as const;

const REQUIRED_CRIT = Object.values(CLAIM);
// The issuer is still "Payconiq" after the rebrand; accept Bancontact too in case it changes.
const ISSUERS = ["payconiq", "bancontact"];
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export type SignatureCheck =
  | { ok: true; kid: string }
  | { ok: false; reason: string; unknownKid?: string };

type JoseHeader = Record<string, unknown> & { alg?: unknown; kid?: unknown; crit?: unknown };

function decodeHeader(part: string): JoseHeader | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as JoseHeader) : null;
  } catch {
    return null;
  }
}

/** "/api/webhooks/bancontact" or "https://palleys.be/api/webhooks/bancontact" → its path. */
function pathOf(value: string) {
  try {
    return new URL(value).pathname;
  } catch {
    return value.split("?")[0];
  }
}

export function verifyCallbackSignature(input: {
  signature: string | null;
  rawBody: string;
  keys: Jwk[];
  expectedPath: string;
  profileId: string | null;
  now?: Date;
}): SignatureCheck {
  const { signature, rawBody, keys } = input;
  if (!signature || signature.length > 4096) return { ok: false, reason: "missing signature" };

  const parts = signature.split(".");
  if (parts.length !== 3 || parts[1] !== "") return { ok: false, reason: "not a detached JWS" };
  const [encodedHeader, , encodedSignature] = parts;

  const header = decodeHeader(encodedHeader);
  if (!header) return { ok: false, reason: "unreadable header" };
  if (header.alg !== "ES256" && header.alg !== "RS256") return { ok: false, reason: `unexpected alg ${String(header.alg)}` };
  if (typeof header.kid !== "string" || !header.kid) return { ok: false, reason: "missing kid" };

  const crit = Array.isArray(header.crit) ? header.crit : [];
  for (const claim of REQUIRED_CRIT) {
    if (!crit.includes(claim)) return { ok: false, reason: `crit misses ${claim}` };
    if (typeof header[claim] !== "string" || !header[claim]) return { ok: false, reason: `missing ${claim}` };
  }
  // Every critical claim must be one we understand (RFC 7515 §4.1.11).
  for (const claim of crit) {
    if (!(REQUIRED_CRIT as string[]).includes(String(claim))) return { ok: false, reason: `unknown crit ${String(claim)}` };
  }

  if (input.profileId && header[CLAIM.sub] !== input.profileId) return { ok: false, reason: "other payment profile" };
  if (!ISSUERS.includes(String(header[CLAIM.iss]).toLowerCase())) return { ok: false, reason: "unexpected issuer" };
  const issuedAt = Date.parse(String(header[CLAIM.iat]));
  const now = (input.now ?? new Date()).getTime();
  if (Number.isNaN(issuedAt) || issuedAt > now + MAX_CLOCK_SKEW_MS) return { ok: false, reason: "invalid iat" };
  if (pathOf(String(header[CLAIM.path])) !== input.expectedPath) return { ok: false, reason: "sent to another path" };

  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) return { ok: false, reason: "unknown kid", unknownKid: header.kid };
  // No algorithm confusion: the key itself must be made for the algorithm the header names.
  const expectedKty = header.alg === "ES256" ? "EC" : "RSA";
  if (jwk.kty !== expectedKty || (jwk.alg !== undefined && jwk.alg !== header.alg)) {
    return { ok: false, reason: "key does not match alg" };
  }
  if (header.alg === "ES256" && jwk.crv !== "P-256") return { ok: false, reason: "unexpected curve" };

  try {
    const key = createPublicKey({ key: jwk, format: "jwk" });
    const signingInput = `${encodedHeader}.${Buffer.from(rawBody, "utf8").toString("base64url")}`;
    const valid = verify(
      "sha256",
      Buffer.from(signingInput, "ascii"),
      header.alg === "ES256" ? { key, dsaEncoding: "ieee-p1363" } : key,
      Buffer.from(encodedSignature, "base64url"),
    );
    return valid ? { ok: true, kid: header.kid } : { ok: false, reason: "bad signature" };
  } catch {
    return { ok: false, reason: "unusable key or signature" };
  }
}
