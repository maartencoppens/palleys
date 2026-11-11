import "server-only";
import {
  isStripeConfigured,
  paymentMethodConfigId,
  stripe,
  stripeKeyMode,
} from "@/core/networking/external/stripe-client";
import { env } from "@/core/utils/env";
import { CHECKOUT_SESSION_MINUTES } from "@/data/checkout";
import { isCheckoutSessionId, isStripeCheckoutUrl, normaliseSession, verifyStripeWebhook } from "./stripe-session";
import type { PaymentProvider } from "./types";

/*
 * Stripe hosted Checkout. Which methods the customer sees (Bancontact, iDEAL | Wero, …) comes from the payment method
 * configuration (STRIPE_PAYMENT_METHOD_CONFIG), managed under /admin/settings/payment-methods. No customer object, so
 * no saved payment methods and no Link; cards stay off in that configuration unless an admin explicitly turns them on.
 * Status comes only from getPayment(): the webhook and the return page only tell us which session to look at.
 */

export const STRIPE_WEBHOOK_PATH = "/api/webhooks/stripe";

const SESSION_EXPAND = ["payment_intent.latest_charge"];

export const stripeProvider: PaymentProvider = {
  name: "stripe",
  isConfigured: isStripeConfigured,
  mode: () => (isStripeConfigured() ? stripeKeyMode() : null),

  async createPayment(input) {
    if (!Number.isInteger(input.amountCents) || input.amountCents < 1) throw new Error("Invalid amount");
    // The SDK's own retries reuse one idempotency key per call, so a network hiccup never makes two sessions.
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      currency: "eur",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: input.amountCents,
            product_data: { name: input.description.slice(0, 250) },
          },
        },
      ],
      payment_method_configuration: paymentMethodConfigId(),
      client_reference_id: input.reference,
      metadata: { orderNumber: input.reference },
      payment_intent_data: {
        metadata: { orderNumber: input.reference },
        description: input.description.slice(0, 1000),
      },
      // Both lead to our return page: it asks our server (which asks Stripe) what really happened. The cancel URL only
      // carries a marker so that page can close the session (see cancelPayment); it is never taken as a payment status.
      success_url: input.returnUrl,
      cancel_url: input.cancelUrl,
      locale: input.locale,
      // Prefilled and locked on the payment page; Stripe asks for an e-mail anyway. No customer object is created.
      ...(input.customerEmail && { customer_email: input.customerEmail }),
      // Stripe's minimum. After that the session is expired and the order closes (webhook or cron).
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_SESSION_MINUTES * 60,
    });
    return normaliseSession(session);
  },

  async getPayment(sessionId) {
    if (!isCheckoutSessionId(sessionId)) throw new Error("Not a Checkout Session id");
    return normaliseSession(await stripe().checkout.sessions.retrieve(sessionId, { expand: SESSION_EXPAND }));
  },

  async cancelPayment(sessionId) {
    if (!isCheckoutSessionId(sessionId)) throw new Error("Not a Checkout Session id");
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    // Only an open session can be expired; a complete one (paid meanwhile) is left alone.
    if (session.status === "open") await stripe().checkout.sessions.expire(sessionId);
  },

  async parseCallback(rawBody, headers) {
    if (!env.STRIPE_WEBHOOK_SECRET) return { ok: false, reason: "STRIPE_WEBHOOK_SECRET is not set" };
    const verified = verifyStripeWebhook(stripe().webhooks, rawBody, headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET);
    if (!verified.ok) return verified;

    const { target } = verified;
    if (target.kind === "session") return { ok: true, paymentId: target.sessionId };

    // A refund or dispute: find the Checkout Session that created this PaymentIntent. A network error throws (→ 500, retry).
    const sessions = await stripe().checkout.sessions.list({ payment_intent: target.paymentIntentId, limit: 1 });
    const session = sessions.data[0];
    return session
      ? { ok: true, paymentId: session.id }
      : { ok: false, ignore: true, reason: `${target.eventType}: no Checkout Session for its PaymentIntent` };
  },

  isCheckoutUrl: isStripeCheckoutUrl,
  isPaymentId: isCheckoutSessionId,
};
