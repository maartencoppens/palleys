import "server-only";
import axios, { type AxiosInstance } from "axios";
import { env } from "@/core/utils/env";
import type { Jwk } from "@/core/modules/payments/providers/bancontact-signature";

/*
 * Server-only Bancontact Pro client (Payment API v3, plain REST over axios). Checked against
 * docs.bancontactpro.com (merchant-payment.openapi v3.6.5, online sales guide, callback guide) on 2026-10-31.
 * Amounts are integer cents, currency EUR only. The API key carries the payment profile and never leaves the server.
 */

const HOSTS = {
  preprod: { api: "https://merchant.api.preprod.bancontact.net", jwks: "https://jwks.preprod.bancontact.net" },
  production: { api: "https://merchant.api.bancontact.net", jwks: "https://jwks.bancontact.net" },
} as const;

const TIMEOUT_MS = 15_000;
// Bancontact rotates keys with a 24h overlap and asks to cache them at most 12 hours.
const JWKS_CACHE_MS = 12 * 60 * 60 * 1000;
const JWKS_MIN_REFETCH_MS = 60 * 1000;

export type BancontactStatus =
  | "PENDING"
  | "IDENTIFIED"
  | "AUTHORIZED"
  | "AUTHORIZATION_FAILED"
  | "FAILED"
  | "SUCCEEDED"
  | "CANCELLED"
  | "EXPIRED"
  | "PENDING_MERCHANT_ACKNOWLEDGEMENT"
  | "VOIDED";

// Only the fields we read. `debtor` (the payer's name and masked IBAN) is deliberately not typed: we never store it.
export type BancontactPayment = {
  paymentId: string;
  status: BancontactStatus;
  amount: number;
  currency: string;
  reference?: string;
  description?: string;
  createdAt: string;
  expiresAt?: string;
  expireAt?: string; // the spec spells it both ways
  succeededAt?: string;
  _links?: { checkout?: { href: string }; deeplink?: { href: string }; qrcode?: { href: string } };
};

export class BancontactError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
  ) {
    super(message);
  }
}
export class BancontactNotConfiguredError extends Error {}

export function isBancontactConfigured() {
  return Boolean(env.BANCONTACT_API_KEY);
}

export function bancontactEnvironment() {
  return env.BANCONTACT_ENV;
}

let instance: AxiosInstance | null = null;

function client() {
  if (!env.BANCONTACT_API_KEY) throw new BancontactNotConfiguredError("BANCONTACT_API_KEY is not set");
  instance ??= axios.create({
    baseURL: HOSTS[env.BANCONTACT_ENV].api,
    timeout: TIMEOUT_MS,
    headers: { Authorization: `Bearer ${env.BANCONTACT_API_KEY}`, "Content-Type": "application/json" },
  });
  return instance;
}

function toBancontactError(error: unknown, action: string) {
  if (axios.isAxiosError<{ code?: string; message?: string }>(error)) {
    const status = error.response?.status ?? null;
    const body = error.response?.data;
    // Error bodies hold a code and a message, no payment data.
    const detail = body?.code ? `${body.code}${body.message ? `: ${body.message}` : ""}` : error.message;
    return new BancontactError(`Bancontact ${action} failed (${status ?? "no response"}): ${detail}`, status);
  }
  return error;
}

const paymentPath = (paymentId: string) => `/v3/payments/${encodeURIComponent(paymentId)}`;

export async function createPayment(input: {
  amountCents: number;
  reference: string; // ≤ 35 chars, SEPA characters; our order number
  description: string; // ≤ 140 chars, shown to the payer and on the bank statement
  returnUrl: string;
  callbackUrl: string | null;
}): Promise<BancontactPayment> {
  if (!Number.isInteger(input.amountCents) || input.amountCents < 1) throw new Error("Invalid amount");
  try {
    const { data } = await client().post<BancontactPayment>("/v3/payments", {
      amount: input.amountCents,
      currency: "EUR",
      reference: input.reference.slice(0, 35),
      description: input.description.slice(0, 140),
      returnUrl: input.returnUrl,
      // Without it Bancontact uses the profile's default callback URL (set in the portal).
      ...(input.callbackUrl && { callbackUrl: input.callbackUrl }),
    });
    return data;
  } catch (error) {
    throw toBancontactError(error, "createPayment");
  }
}

export async function getPayment(paymentId: string): Promise<BancontactPayment> {
  try {
    const { data } = await client().get<BancontactPayment>(paymentPath(paymentId));
    return data;
  } catch (error) {
    throw toBancontactError(error, "getPayment");
  }
}

/** Only while the payment is PENDING or IDENTIFIED (the payer hasn't confirmed yet). */
export async function cancelPayment(paymentId: string) {
  try {
    await client().delete(paymentPath(paymentId));
  } catch (error) {
    throw toBancontactError(error, "cancelPayment");
  }
}

let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null;

/** Bancontact's public keys for callback signatures. Cached; `refresh` re-fetches (at most once a minute). */
export async function getCallbackKeys({ refresh = false } = {}): Promise<Jwk[]> {
  const age = jwksCache ? Date.now() - jwksCache.fetchedAt : Infinity;
  if (jwksCache && age < JWKS_CACHE_MS && (!refresh || age < JWKS_MIN_REFETCH_MS)) return jwksCache.keys;
  try {
    const { data } = await axios.get<{ keys?: Jwk[] }>(HOSTS[env.BANCONTACT_ENV].jwks, { timeout: TIMEOUT_MS });
    const keys = Array.isArray(data.keys) ? data.keys : [];
    jwksCache = { keys, fetchedAt: Date.now() };
    return keys;
  } catch (error) {
    throw toBancontactError(error, "JWKS");
  }
}
