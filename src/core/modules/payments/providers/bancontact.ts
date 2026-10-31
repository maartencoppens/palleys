import "server-only";
import { z } from "zod";
import {
  bancontactEnvironment,
  createPayment,
  getCallbackKeys,
  getPayment,
  isBancontactConfigured,
  type BancontactPayment,
  type BancontactStatus,
} from "@/core/networking/external/bancontact-client";
import { env } from "@/core/utils/env";
import type { PaymentStatus } from "@/db/generated/enums";
import { verifyCallbackSignature } from "./bancontact-signature";
import type { PaymentProvider, ProviderPayment } from "./types";

export const BANCONTACT_CALLBACK_PATH = "/api/webhooks/bancontact";

// Bancontact Pro statuses (docs.bancontactpro.com, Payment API v3) → ours.
const STATUS: Record<BancontactStatus, PaymentStatus> = {
  PENDING: "OPEN", // created, nobody scanned or opened it yet
  IDENTIFIED: "PENDING", // the payer opened it in their app
  AUTHORIZED: "AUTHORIZED",
  PENDING_MERCHANT_ACKNOWLEDGEMENT: "AUTHORIZED",
  SUCCEEDED: "PAID",
  AUTHORIZATION_FAILED: "FAILED",
  FAILED: "FAILED",
  CANCELLED: "CANCELED",
  VOIDED: "CANCELED",
  EXPIRED: "EXPIRED", // after 20 minutes
};

export function mapBancontactStatus(status: string): PaymentStatus {
  const mapped = STATUS[status as BancontactStatus];
  if (!mapped) throw new Error(`Unknown Bancontact payment status "${status}"`);
  return mapped;
}

function normalise(payment: BancontactPayment): ProviderPayment {
  if (!Number.isInteger(payment.amount)) throw new Error(`Unexpected Bancontact amount for ${payment.paymentId}`);
  return {
    id: payment.paymentId,
    status: mapBancontactStatus(payment.status),
    mode: bancontactEnvironment() === "production" ? "live" : "test",
    method: "bancontact",
    amountCents: payment.amount,
    currency: payment.currency ?? "EUR",
    // Refunds go through the Bancontact Pro portal for now; their status isn't on the payment object.
    refundedCents: 0,
    chargedBackCents: 0,
    reference: payment.reference ?? null,
    checkoutUrl: payment._links?.checkout?.href ?? null,
    // Whitelist, not the raw object: `debtor` holds the payer's name and IBAN (GDPR: not needed).
    snapshot: {
      paymentId: payment.paymentId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      reference: payment.reference ?? null,
      createdAt: payment.createdAt,
      expiresAt: payment.expiresAt ?? payment.expireAt ?? null,
      succeededAt: payment.succeededAt ?? null,
    },
  };
}

// Payment ids are 24 characters; allow a little slack in case the format grows.
const PAYMENT_ID = /^[A-Za-z0-9]{16,40}$/;
const callbackBodySchema = z.object({ paymentId: z.string().regex(PAYMENT_ID) });

export const bancontactProvider: PaymentProvider = {
  name: "bancontact",
  isConfigured: isBancontactConfigured,
  mode: () => (isBancontactConfigured() ? (bancontactEnvironment() === "production" ? "live" : "test") : null),
  async createPayment(input) {
    return normalise(await createPayment(input));
  },
  async getPayment(paymentId) {
    return normalise(await getPayment(paymentId));
  },
  async parseCallback(rawBody, headers) {
    const signature = headers.get("signature");
    const verifyWith = (keys: Awaited<ReturnType<typeof getCallbackKeys>>) =>
      verifyCallbackSignature({
        signature,
        rawBody,
        keys,
        expectedPath: BANCONTACT_CALLBACK_PATH,
        profileId: env.BANCONTACT_PAYMENT_PROFILE_ID ?? null,
      });

    let check = verifyWith(await getCallbackKeys());
    // A key we don't know yet: Bancontact rotated it. Fetch the key set again, once.
    if (!check.ok && check.unknownKid) check = verifyWith(await getCallbackKeys({ refresh: true }));
    if (!check.ok) return { ok: false, reason: check.reason };

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return { ok: false, reason: "body is not JSON" };
    }
    const body = callbackBodySchema.safeParse(parsed);
    return body.success ? { ok: true, paymentId: body.data.paymentId } : { ok: false, reason: "no payment id" };
  },
  isCheckoutUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" && (parsed.hostname === "bancontact.net" || parsed.hostname.endsWith(".bancontact.net"));
    } catch {
      return false;
    }
  },
  isPaymentId: (id) => PAYMENT_ID.test(id),
};
