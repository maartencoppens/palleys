import type { PaymentStatus } from "@/db/generated/enums";

/*
 * What the rest of the app knows about a payment provider. Stripe (hosted Checkout) is the implementation; another one
 * only needs to implement this interface. Amounts are integer cents.
 */

/** A payment as the provider reports it right now, already normalised. The only source of truth for status. */
export type ProviderPayment = {
  id: string;
  status: PaymentStatus;
  mode: "test" | "live";
  method: string | null;
  amountCents: number;
  currency: string;
  refundedCents: number;
  chargedBackCents: number;
  /** What we sent as reference when creating it: our order number. Checked against the order on every update. */
  reference: string | null;
  checkoutUrl: string | null;
  /** Safe subset of the provider's object for debugging in the admin: no bank account or payer details. */
  snapshot: Record<string, unknown>;
};

export type CreatePaymentInput = {
  amountCents: number;
  /** Our order number. Short and SEPA-safe, e.g. PLY1042 (at most 12 characters). */
  reference: string;
  /** Shown to the payer and on their bank statement. */
  description: string;
  /** Where the customer lands after paying. Proves nothing: that page asks our server for the status. */
  returnUrl: string;
  /** Where the customer lands after giving up on the payment page: the same page, marked, so the session can be closed. */
  cancelUrl: string;
  /** The order's language, for the provider's payment page. */
  locale: "nl" | "en";
  /** The customer's e-mail from our checkout, so the payment page doesn't ask for it again. Null for an order without one. */
  customerEmail: string | null;
};

/**
 * `ok: false` without `ignore`: the signature didn't check out (the route answers 400).
 * `ok: false, ignore: true`: signed and genuine, but nothing for us (an event we don't handle; the route answers 200).
 */
export type CallbackResult = { ok: true; paymentId: string } | { ok: false; reason: string; ignore?: true };

export interface PaymentProvider {
  readonly name: string;
  isConfigured(): boolean;
  mode(): "test" | "live" | null;
  createPayment(input: CreatePaymentInput): Promise<ProviderPayment>;
  getPayment(paymentId: string): Promise<ProviderPayment>;
  /** Closes a payment that is still open (the customer gave up), so nobody can pay it afterwards. No-op otherwise. */
  cancelPayment?(paymentId: string): Promise<void>;
  /** Checks a status callback's signature and returns the payment it is about. Its status is never trusted. */
  parseCallback(rawBody: string, headers: Headers): Promise<CallbackResult>;
  /** Hosts the customer may be redirected to for paying; anything else is refused. */
  isCheckoutUrl(url: string): boolean;
  /** Format check for payment ids, before anything is looked up. */
  isPaymentId(id: string): boolean;
}
