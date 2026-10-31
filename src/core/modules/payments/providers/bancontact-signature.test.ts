import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyCallbackSignature, type Jwk } from "./bancontact-signature";

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const jwk: Jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-key-1" };
const other = generateKeyPairSync("ec", { namedCurve: "P-256" });
const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
const rsaJwk: Jwk = { ...rsa.publicKey.export({ format: "jwk" }), kid: "rsa-key", alg: "RS256" };

const PROFILE = "5fb3c1a0e9f0a1234567abcd";
const PATH = "/api/webhooks/bancontact";
const NOW = new Date("2026-10-31T12:00:00Z");
const body = JSON.stringify({ paymentId: "f1a2b3c4d5e6f7a8b9c0d1e2", status: "SUCCEEDED", amount: 3294 });

function header(overrides: Record<string, unknown> = {}) {
  return {
    typ: "jose+json",
    kid: "test-key-1",
    alg: "ES256",
    crit: [
      "https://payconiq.com/sub",
      "https://payconiq.com/iss",
      "https://payconiq.com/iat",
      "https://payconiq.com/jti",
      "https://payconiq.com/path",
    ],
    "https://payconiq.com/sub": PROFILE,
    "https://payconiq.com/iss": "Payconiq",
    "https://payconiq.com/iat": "2026-10-31T11:59:58.123Z",
    "https://payconiq.com/jti": "abc-123",
    "https://payconiq.com/path": `https://palleys.be${PATH}`,
    ...overrides,
  };
}

function detachedJws(h: object, payload: string, key = privateKey, rsaKey = false) {
  const encodedHeader = Buffer.from(JSON.stringify(h)).toString("base64url");
  const input = `${encodedHeader}.${Buffer.from(payload).toString("base64url")}`;
  const signature = sign("sha256", Buffer.from(input), rsaKey ? key : { key, dsaEncoding: "ieee-p1363" });
  return `${encodedHeader}..${signature.toString("base64url")}`;
}

const check = (signature: string | null, rawBody = body, profileId: string | null = PROFILE) =>
  verifyCallbackSignature({ signature, rawBody, keys: [jwk, rsaJwk], expectedPath: PATH, profileId, now: NOW });

describe("Bancontact callback signature", () => {
  it("accepts a valid detached ES256 JWS", () => {
    expect(check(detachedJws(header(), body))).toEqual({ ok: true, kid: "test-key-1" });
  });

  it("accepts a path claim without host", () => {
    expect(check(detachedJws(header({ "https://payconiq.com/path": PATH }), body)).ok).toBe(true);
  });

  it("rejects a changed body", () => {
    const signature = detachedJws(header(), body);
    expect(check(signature, body.replace("3294", "1"))).toMatchObject({ ok: false, reason: "bad signature" });
  });

  it("rejects a signature by another key with the same kid", () => {
    expect(check(detachedJws(header(), body, other.privateKey))).toMatchObject({ ok: false, reason: "bad signature" });
  });

  it("asks for a key refresh on an unknown kid", () => {
    expect(check(detachedJws(header({ kid: "rotated" }), body))).toMatchObject({ ok: false, unknownKid: "rotated" });
  });

  it("rejects other profiles, paths, algorithms and missing claims", () => {
    expect(check(detachedJws(header({ "https://payconiq.com/sub": "someone-else" }), body)).ok).toBe(false);
    expect(check(detachedJws(header({ "https://payconiq.com/path": "/api/other" }), body)).ok).toBe(false);
    expect(check(detachedJws(header({ alg: "none" }), body)).ok).toBe(false);
    expect(check(detachedJws(header({ alg: "HS256" }), body)).ok).toBe(false);
    expect(check(detachedJws(header({ "https://payconiq.com/jti": undefined }), body)).ok).toBe(false);
    expect(check(detachedJws(header({ crit: ["https://payconiq.com/sub"] }), body)).ok).toBe(false);
    expect(check(detachedJws(header({ "https://payconiq.com/iat": "2026-10-31T13:00:00Z" }), body)).ok).toBe(false);
  });

  it("accepts RS256 with an RSA key from the key set", () => {
    const signature = detachedJws(header({ alg: "RS256", kid: "rsa-key" }), body, rsa.privateKey, true);
    expect(check(signature)).toEqual({ ok: true, kid: "rsa-key" });
  });

  it("refuses algorithm confusion between key types", () => {
    // RS256 header pointing at the EC key, and ES256 header pointing at the RSA key.
    expect(check(detachedJws(header({ alg: "RS256" }), body, rsa.privateKey, true))).toMatchObject({
      ok: false,
      reason: "key does not match alg",
    });
    expect(check(detachedJws(header({ kid: "rsa-key" }), body))).toMatchObject({ ok: false, reason: "key does not match alg" });
  });

  it("rejects malformed input", () => {
    expect(check(null).ok).toBe(false);
    expect(check("not-a-jws").ok).toBe(false);
    expect(check("a.b.c").ok).toBe(false);
    expect(check(`${Buffer.from("{").toString("base64url")}..xx`).ok).toBe(false);
  });

  it("skips the profile check only when no profile id is configured", () => {
    const signature = detachedJws(header({ "https://payconiq.com/sub": "any" }), body);
    expect(check(signature, body, null).ok).toBe(true);
    expect(check(signature, body, PROFILE).ok).toBe(false);
  });
});
