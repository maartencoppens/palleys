// How customers pay: Stripe's hosted Checkout page. Which methods it shows is set in Stripe's payment method
// configuration (STRIPE_PAYMENT_METHOD_CONFIG); an admin toggles them under /admin/settings/payment-methods.
// Stripe stays the only source of truth for on/off: nothing about it is stored in our database.

/*
 * The allowlist: methods our code really supports and an admin may turn on. Everything else Stripe lists is shown
 * read-only. Adding one (e.g. "eps" or "klarna"):
 *   1. Check in Stripe's docs that it works with Checkout, mode "payment", EUR, and how it confirms (immediate or async;
 *      async needs nothing extra, the webhook handles checkout.session.async_payment_*). Methods that authorise first and
 *      capture later (Klarna) need a check that our status mapping in providers/stripe-session.ts still fits.
 *   2. Add it below with its label (as Stripe/the brand writes it).
 *   3. Check the customer texts in core/locale/messages (checkout, refunds, privacy, terms 6.1) still say the right thing.
 *   4. Activate it in the Stripe dashboard (test and live), then turn it on in the admin.
 */
export const PAYMENT_METHODS = ["bancontact", "ideal", "wero"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// Card payments: off by default and more expensive per payment. Can be turned on, but only after an explicit confirmation.
export const CARD_PAYMENT_METHODS = ["card", "apple_pay", "google_pay", "link"] as const;
export type CardPaymentMethod = (typeof CARD_PAYMENT_METHODS)[number];

export type ToggleablePaymentMethod = PaymentMethod | CardPaymentMethod;
export const TOGGLEABLE_PAYMENT_METHODS: readonly ToggleablePaymentMethod[] = [...PAYMENT_METHODS, ...CARD_PAYMENT_METHODS];

export const isToggleablePaymentMethod = (method: string): method is ToggleablePaymentMethod =>
  (TOGGLEABLE_PAYMENT_METHODS as readonly string[]).includes(method);
export const isCardPaymentMethod = (method: string): method is CardPaymentMethod =>
  (CARD_PAYMENT_METHODS as readonly string[]).includes(method);

// What the customer side shows when Stripe can't be asked which methods are on.
export const FALLBACK_CHECKOUT_METHODS: readonly ToggleablePaymentMethod[] = ["bancontact"];

// How long the customer side trusts its answer about which methods are on (an admin change clears it right away).
export const PAYMENT_METHODS_CACHE_MS = 60_000;

// Money that reached us outside the checkout, recorded by an admin on a manually added order.
export const MANUAL_PAYMENT_PROVIDER = "manual";
export const MANUAL_PAYMENT_METHODS = ["cash", "transfer", "gift", "other"] as const;
export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];
// A stock order has nothing to pay; this marks it as settled so it can go into production.
export const STOCK_PAYMENT_METHOD = "stock";

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bancontact: "Bancontact",
  ideal: "iDEAL | Wero",
  wero: "Wero",
  card: "Kaart",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  link: "Link",
  cash: "Contant",
  transfer: "Overschrijving",
  gift: "Geschenk (geen betaling)",
  other: "Anders",
  discount: "Gratis met kortingscode",
  stock: "Voorraadorder (geen betaling)",
};
