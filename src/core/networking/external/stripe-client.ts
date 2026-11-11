import "server-only";
import Stripe from "stripe";
import { env } from "@/core/utils/env";

/*
 * Server-only Stripe client. An exception to our axios rule: the official SDK checks webhook signatures and retries
 * safely (it adds an idempotency key to every POST itself). The API version is pinned, so a new SDK or a change in
 * the dashboard's default version can't change the shape of what we read. Checked against docs.stripe.com on 2026-11-11.
 */

export const STRIPE_API_VERSION = "2026-10-28.endive";

export class StripeNotConfiguredError extends Error {}

let instance: Stripe | null = null;

/** One instance for the whole process, made on first use (so a missing key only matters when we actually pay). */
export function stripe(): Stripe {
  if (!env.STRIPE_SECRET) throw new StripeNotConfiguredError("STRIPE_SECRET is not set");
  instance ??= new Stripe(env.STRIPE_SECRET, {
    apiVersion: STRIPE_API_VERSION,
    maxNetworkRetries: 2,
    timeout: 15_000,
    appInfo: { name: "palleys" },
  });
  return instance;
}

/** Everything a payment needs: the key, the webhook secret and the payment method configuration. */
export function isStripeConfigured() {
  return Boolean(env.STRIPE_SECRET && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_PAYMENT_METHOD_CONFIG);
}

/** Test or live, from the key's prefix. Null without a key. */
export function stripeKeyMode(): "test" | "live" | null {
  if (!env.STRIPE_SECRET) return null;
  return /^(sk|rk)_live_/.test(env.STRIPE_SECRET) ? "live" : "test";
}

export function paymentMethodConfigId() {
  if (!env.STRIPE_PAYMENT_METHOD_CONFIG) throw new StripeNotConfiguredError("STRIPE_PAYMENT_METHOD_CONFIG is not set");
  return env.STRIPE_PAYMENT_METHOD_CONFIG;
}

/** A short, safe description of a Stripe error for logs and the admin: type, code and message, no request data. */
export function describeStripeError(error: unknown) {
  if (error instanceof Stripe.errors.StripeError) {
    return {
      status: error.statusCode ?? null,
      code: error.code ?? null,
      type: error.type,
      message: error.message,
    };
  }
  return { status: null, code: null, type: "unknown", message: error instanceof Error ? error.message : String(error) };
}
