import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import {
  isCheckoutSessionId,
  isStripeCheckoutUrl,
  mapSessionStatus,
  normaliseSession,
  sessionSnapshot,
  verifyStripeWebhook,
} from "./stripe-session";

// No network: the client is only used for its webhook helpers (HMAC), which run locally.
const webhooks = new Stripe("sk_test_unit", { apiVersion: "2026-10-28.endive" }).webhooks;
const SECRET = "whsec_unittestsecret";
const SESSION_ID = "cs_test_a1B2c3D4e5F6g7H8";

function event(type: string, object: Record<string, unknown>) {
  return JSON.stringify({
    id: "evt_test_1",
    object: "event",
    api_version: "2026-10-28.endive",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    type,
    data: { object },
  });
}

const sign = (payload: string, timestamp?: number) => webhooks.generateTestHeaderString({ payload, secret: SECRET, timestamp });

// A session as Stripe returns it with payment_intent.latest_charge expanded, including personal data we must drop.
function session(overrides: Partial<Stripe.Checkout.Session> = {}, charge: Partial<Stripe.Charge> = {}): Stripe.Checkout.Session {
  return {
    id: SESSION_ID,
    object: "checkout.session",
    status: "complete",
    payment_status: "paid",
    amount_total: 3294,
    currency: "eur",
    livemode: false,
    client_reference_id: "PLY1042",
    metadata: { orderNumber: "PLY1042" },
    url: null,
    created: 1_762_860_000,
    expires_at: 1_762_861_800,
    customer_details: { email: "jan@example.com", name: "Jan Peeters", phone: "+32470000000", address: null, tax_exempt: "none", tax_ids: [] },
    customer_email: "jan@example.com",
    payment_intent: {
      id: "pi_test_1",
      object: "payment_intent",
      status: "succeeded",
      last_payment_error: null,
      latest_charge: {
        id: "ch_test_1",
        object: "charge",
        amount: 3294,
        amount_refunded: 0,
        disputed: false,
        billing_details: { name: "Jan Peeters", email: "jan@example.com", phone: null, address: null },
        payment_method_details: {
          type: "bancontact",
          bancontact: { iban_last4: "1234", verified_name: "Jan Peeters", bank_name: "KBC" },
        },
        ...charge,
      },
    },
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

describe("mapSessionStatus", () => {
  it.each([
    [{ status: "open", payment_status: "unpaid" }, null, false, "OPEN"],
    [{ status: "complete", payment_status: "paid" }, "succeeded", false, "PAID"],
    [{ status: "complete", payment_status: "unpaid" }, "processing", false, "PENDING"],
    [{ status: "complete", payment_status: "unpaid" }, null, false, "PENDING"],
    [{ status: "complete", payment_status: "unpaid" }, "requires_payment_method", true, "FAILED"],
    [{ status: "complete", payment_status: "unpaid" }, "canceled", false, "CANCELED"],
    [{ status: "complete", payment_status: "no_payment_required" }, null, false, "PENDING"],
    [{ status: "expired", payment_status: "unpaid" }, "canceled", false, "EXPIRED"],
  ] as const)("%o + intent %s → %s", (sessionState, intentStatus, failed, expected) => {
    expect(mapSessionStatus(sessionState, intentStatus, failed)).toBe(expected);
  });

  it("never treats an open session as paid, even if payment_status says so", () => {
    expect(mapSessionStatus({ status: "open", payment_status: "paid" }, "succeeded")).toBe("OPEN");
  });

  it("refuses statuses it doesn't know", () => {
    expect(() => mapSessionStatus({ status: "weird" as never, payment_status: "paid" }, null)).toThrow();
  });
});

describe("normaliseSession", () => {
  it("maps a paid Bancontact session", () => {
    expect(normaliseSession(session())).toMatchObject({
      id: SESSION_ID,
      status: "PAID",
      mode: "test",
      method: "bancontact",
      amountCents: 3294,
      currency: "EUR",
      refundedCents: 0,
      chargedBackCents: 0,
      reference: "PLY1042",
    });
  });

  it("reports the method really used (iDEAL | Wero, Wero) and live mode", () => {
    expect(normaliseSession(session({ livemode: true }, { payment_method_details: { type: "ideal" } as never }))).toMatchObject({
      method: "ideal",
      mode: "live",
    });
    expect(normaliseSession(session({}, { payment_method_details: { type: "wero" } as never })).method).toBe("wero");
  });

  it("reads refunds and disputes from the latest charge", () => {
    expect(normaliseSession(session({}, { amount_refunded: 1000 })).refundedCents).toBe(1000);
    expect(normaliseSession(session({}, { disputed: true })).chargedBackCents).toBe(3294);
  });

  it("works without an expanded PaymentIntent (open session)", () => {
    const open = normaliseSession(
      session({ status: "open", payment_status: "unpaid", payment_intent: null, url: "https://checkout.stripe.com/c/pay/cs_test_x" }),
    );
    expect(open).toMatchObject({ status: "OPEN", method: null, refundedCents: 0, checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_x" });
  });

  it("refuses a session without an amount or with a strange id", () => {
    expect(() => normaliseSession(session({ amount_total: null }))).toThrow();
    expect(() => normaliseSession(session({ id: "pi_123" }))).toThrow();
  });
});

describe("sessionSnapshot", () => {
  it("keeps no personal data", () => {
    const snapshot = sessionSnapshot(session());
    const text = JSON.stringify(snapshot);
    for (const personal of ["jan@example.com", "Jan Peeters", "+32470000000", "1234", "iban", "verified_name", "billing", "customer"]) {
      expect(text).not.toContain(personal);
    }
    expect(snapshot).toMatchObject({ sessionId: SESSION_ID, status: "complete", paymentStatus: "paid", method: "bancontact" });
  });
});

describe("ids and URLs", () => {
  it("accepts only Checkout Session ids", () => {
    expect(isCheckoutSessionId("cs_test_a1B2c3")).toBe(true);
    expect(isCheckoutSessionId("cs_live_a1B2c3")).toBe(true);
    for (const id of ["cs_a1B2c3", "pi_test_123", "cs_test_", "cs_test_abc-def", "cs_test_abc/../x", "", "CS_TEST_abc"]) {
      expect(isCheckoutSessionId(id)).toBe(false);
    }
  });

  it("accepts only Stripe's hosted checkout over https", () => {
    expect(isStripeCheckoutUrl("https://checkout.stripe.com/c/pay/cs_test_abc#fragment")).toBe(true);
    for (const url of [
      "http://checkout.stripe.com/c/pay/cs_test_abc",
      "https://checkout.stripe.com.evil.example/c/pay",
      "https://evil.example/https://checkout.stripe.com/",
      "https://user:pass@checkout.stripe.com/c/pay",
      "https://checkout.stripe.com:8443/c/pay",
      "https://stripe.com/checkout",
      "not a url",
    ]) {
      expect(isStripeCheckoutUrl(url)).toBe(false);
    }
  });
});

describe("verifyStripeWebhook", () => {
  it("accepts a valid signature and returns only the session id", () => {
    const payload = event("checkout.session.completed", { id: SESSION_ID, object: "checkout.session", payment_status: "paid" });
    expect(verifyStripeWebhook(webhooks, payload, sign(payload), SECRET)).toEqual({
      ok: true,
      target: { kind: "session", sessionId: SESSION_ID, eventType: "checkout.session.completed" },
    });
  });

  it.each(["checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"])(
    "handles %s",
    (type) => {
      const payload = event(type, { id: SESSION_ID, object: "checkout.session" });
      expect(verifyStripeWebhook(webhooks, payload, sign(payload), SECRET)).toMatchObject({ ok: true, target: { sessionId: SESSION_ID } });
    },
  );

  it("points refunds and disputes at their PaymentIntent", () => {
    const refund = event("charge.refunded", { id: "ch_test_1", object: "charge", payment_intent: "pi_test_1" });
    expect(verifyStripeWebhook(webhooks, refund, sign(refund), SECRET)).toMatchObject({
      ok: true,
      target: { kind: "payment_intent", paymentIntentId: "pi_test_1" },
    });
    const dispute = event("charge.dispute.created", { id: "dp_test_1", object: "dispute", payment_intent: "pi_test_2" });
    expect(verifyStripeWebhook(webhooks, dispute, sign(dispute), SECRET)).toMatchObject({
      ok: true,
      target: { kind: "payment_intent", paymentIntentId: "pi_test_2" },
    });
  });

  it("refuses an invalid signature", () => {
    const payload = event("checkout.session.completed", { id: SESSION_ID });
    const forged = webhooks.generateTestHeaderString({ payload, secret: "whsec_someoneelse" });
    const result = verifyStripeWebhook(webhooks, payload, forged, SECRET);
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty("ignore");
  });

  it("refuses a body that was changed after signing", () => {
    const payload = event("checkout.session.completed", { id: SESSION_ID });
    const tampered = payload.replace(SESSION_ID, "cs_test_someoneelse");
    expect(verifyStripeWebhook(webhooks, tampered, sign(payload), SECRET)).toMatchObject({ ok: false });
  });

  it("refuses an expired signature (replay)", () => {
    const payload = event("checkout.session.completed", { id: SESSION_ID });
    const old = sign(payload, Math.floor(Date.now() / 1000) - 10 * 60);
    const result = verifyStripeWebhook(webhooks, payload, old, SECRET);
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty("ignore");
  });

  it("refuses a missing header", () => {
    expect(verifyStripeWebhook(webhooks, "{}", null, SECRET)).toMatchObject({ ok: false });
  });

  it("acknowledges events it doesn't handle without an error", () => {
    const payload = event("customer.created", { id: "cus_test_1" });
    expect(verifyStripeWebhook(webhooks, payload, sign(payload), SECRET)).toMatchObject({ ok: false, ignore: true });
    const noIntent = event("charge.refunded", { id: "ch_test_1", payment_intent: null });
    expect(verifyStripeWebhook(webhooks, noIntent, sign(noIntent), SECRET)).toMatchObject({ ok: false, ignore: true });
  });
});
