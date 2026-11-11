import type Stripe from "stripe";
import type { PaymentStatus } from "@/db/generated/enums";
import type { CallbackResult, ProviderPayment } from "./types";

/*
 * The pure half of the Stripe provider (no network, no server-only), so it can be unit tested: Checkout Session →
 * ProviderPayment, the snapshot we keep, id/URL checks and webhook verification. stripe.ts does the API calls.
 */

export const CHECKOUT_SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]+$/;

export const isCheckoutSessionId = (id: string) => CHECKOUT_SESSION_ID.test(id);

/** Only Stripe's own hosted Checkout page; anything else is refused before we redirect a customer there. */
export function isStripeCheckoutUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "checkout.stripe.com" && !parsed.username && !parsed.password && !parsed.port;
  } catch {
    return false;
  }
}

/** The webhook events we act on. Everything else is acknowledged and ignored. */
export const STRIPE_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "charge.refunded",
  "charge.dispute.created",
] as const;
type HandledEvent = (typeof STRIPE_WEBHOOK_EVENTS)[number];

const isHandled = (type: string): type is HandledEvent => (STRIPE_WEBHOOK_EVENTS as readonly string[]).includes(type);

function expandedIntent(session: Stripe.Checkout.Session): Stripe.PaymentIntent | null {
  return session.payment_intent && typeof session.payment_intent === "object" ? session.payment_intent : null;
}

function expandedCharge(intent: Stripe.PaymentIntent | null): Stripe.Charge | null {
  return intent?.latest_charge && typeof intent.latest_charge === "object" ? intent.latest_charge : null;
}

/**
 * Checkout Session (+ its PaymentIntent) → our status. Never PAID unless Stripe says the session is complete and paid.
 * open → OPEN · complete + paid → PAID · complete + still processing → PENDING · expired → EXPIRED ·
 * a PaymentIntent that failed or was canceled after the session completed → FAILED / CANCELED.
 */
export function mapSessionStatus(
  session: Pick<Stripe.Checkout.Session, "status" | "payment_status">,
  intentStatus: Stripe.PaymentIntent.Status | null,
  intentFailed = false,
): PaymentStatus {
  switch (session.status) {
    case "open":
      return "OPEN";
    case "expired":
      return "EXPIRED";
    case "complete":
      if (session.payment_status === "paid") return "PAID";
      if (intentStatus === "canceled") return "CANCELED";
      // An async method that failed after the customer finished Checkout (async_payment_failed).
      if (intentStatus === "requires_payment_method" && intentFailed) return "FAILED";
      return "PENDING";
    default:
      throw new Error(`Unknown Checkout Session status "${session.status}"`);
  }
}

export function normaliseSession(session: Stripe.Checkout.Session): ProviderPayment {
  if (!isCheckoutSessionId(session.id)) throw new Error("Unexpected Checkout Session id");
  if (session.amount_total === null || !Number.isInteger(session.amount_total)) {
    throw new Error(`Unexpected amount on ${session.id}`);
  }
  const intent = expandedIntent(session);
  const charge = expandedCharge(intent);
  const method = charge?.payment_method_details?.type ?? null;
  return {
    id: session.id,
    status: mapSessionStatus(session, intent?.status ?? null, Boolean(intent?.last_payment_error)),
    mode: session.livemode ? "live" : "test",
    method,
    amountCents: session.amount_total,
    currency: (session.currency ?? "").toUpperCase(),
    refundedCents: charge?.amount_refunded ?? 0,
    // A dispute puts the whole charge at risk until it's decided: flag the full amount.
    chargedBackCents: charge?.disputed ? charge.amount : 0,
    reference: session.client_reference_id ?? null,
    checkoutUrl: session.url ?? null,
    snapshot: sessionSnapshot(session, intent, charge),
  };
}

/**
 * What we keep of the session in Payment.rawLastStatus. A whitelist, never the object itself: customer_details,
 * billing details, the bank account (IBAN last4, verified_name) and e-mail stay at Stripe (GDPR: we don't need them).
 */
export function sessionSnapshot(
  session: Stripe.Checkout.Session,
  intent: Stripe.PaymentIntent | null = expandedIntent(session),
  charge: Stripe.Charge | null = expandedCharge(intent),
) {
  return {
    sessionId: session.id,
    status: session.status,
    paymentStatus: session.payment_status,
    amountTotal: session.amount_total,
    currency: session.currency,
    livemode: session.livemode,
    clientReferenceId: session.client_reference_id ?? null,
    createdAt: new Date(session.created * 1000).toISOString(),
    expiresAt: new Date(session.expires_at * 1000).toISOString(),
    paymentIntentId: intent?.id ?? (typeof session.payment_intent === "string" ? session.payment_intent : null),
    paymentIntentStatus: intent?.status ?? null,
    failureCode: intent?.last_payment_error?.code ?? null,
    method: charge?.payment_method_details?.type ?? null,
    chargeId: charge?.id ?? null,
    amountRefunded: charge?.amount_refunded ?? 0,
    disputed: charge?.disputed ?? false,
  };
}

/** What a verified webhook is about: a session id directly, or a PaymentIntent whose session still has to be found. */
export type StripeWebhookTarget =
  | { kind: "session"; sessionId: string; eventType: string }
  | { kind: "payment_intent"; paymentIntentId: string; eventType: string };

export type VerifiedWebhook = { ok: true; target: StripeWebhookTarget } | Extract<CallbackResult, { ok: false }>;

const idOf = (value: string | { id: string } | null | undefined) => (typeof value === "string" ? value : (value?.id ?? null));

/**
 * Checks the `stripe-signature` header over the exact raw body (HMAC, with a 5-minute tolerance against replays) and
 * picks out the id we need. The event's contents are never trusted beyond that id: the status is fetched again.
 */
export function verifyStripeWebhook(
  webhooks: Pick<Stripe["webhooks"], "constructEvent">,
  rawBody: string,
  signature: string | null,
  secret: string,
): VerifiedWebhook {
  if (!signature) return { ok: false, reason: "missing stripe-signature header" };
  let event: Stripe.Event;
  try {
    event = webhooks.constructEvent(rawBody, signature, secret);
  } catch (error) {
    return { ok: false, reason: `invalid signature: ${error instanceof Error ? error.message : "unknown"}` };
  }

  if (!isHandled(event.type)) return { ok: false, ignore: true, reason: `event ${event.type} not handled` };

  const object = event.data.object as { id?: string; payment_intent?: string | { id: string } | null };
  if (event.type.startsWith("checkout.session.")) {
    return object.id && isCheckoutSessionId(object.id)
      ? { ok: true, target: { kind: "session", sessionId: object.id, eventType: event.type } }
      : { ok: false, ignore: true, reason: `${event.type} without a Checkout Session id` };
  }
  // charge.refunded (a Charge) and charge.dispute.created (a Dispute) both point at the PaymentIntent.
  const paymentIntentId = idOf(object.payment_intent);
  return paymentIntentId
    ? { ok: true, target: { kind: "payment_intent", paymentIntentId, eventType: event.type } }
    : { ok: false, ignore: true, reason: `${event.type} without a PaymentIntent` };
}
