// Checkout and order settings. No server-only imports.

// LEGAL-REVIEW: bump this whenever the terms change, and keep every published version reachable
// (Order.termsVersion records which one a customer accepted).
export const TERMS_VERSION = "2026-11-11-concept"; // 4.2: the button is now "Bestellen en betalen"
export const TERMS_URL = "/algemene-voorwaarden";
export const PRIVACY_URL = "/privacy";

// A Stripe Checkout Session (the payment page) stays open this long: Stripe's minimum.
export const CHECKOUT_SESSION_MINUTES = 30;

// Orders still waiting for payment after this long are checked at Stripe and closed (cron). A little longer than
// the session, so the cron finds it expired rather than about to.
export const PENDING_ORDER_MAX_AGE_MS = (CHECKOUT_SESSION_MINUTES + 5) * 60 * 1000;

// The return page asks Stripe directly at most this often per order (covers callbacks that can't reach us, e.g. localhost).
export const PAYMENT_SYNC_MIN_INTERVAL_MS = 5_000;
export const RETURN_POLL_INTERVAL_MS = 2_500;
export const RETURN_POLL_MAX_MS = 3 * 60 * 1000;

// Rate limits (per IP, fixed window).
export const RATE_LIMITS = {
  checkout: { max: 10, windowMs: 10 * 60 * 1000 },
  deliveryOptions: { max: 60, windowMs: 10 * 60 * 1000 },
  discount: { max: 15, windowMs: 10 * 60 * 1000 },
  cart: { max: 120, windowMs: 10 * 60 * 1000 },
  uploads: { max: 20, windowMs: 60 * 60 * 1000 },
  orderStatus: { max: 120, windowMs: 10 * 60 * 1000 },
  // /retour: looking up an order per IP, and per order number (so nobody floods a customer's inbox with links).
  returnLookup: { max: 10, windowMs: 10 * 60 * 1000 },
  returnLookupOrder: { max: 3, windowMs: 60 * 60 * 1000 },
  // The contact form on the homepage: each message is a mail to us.
  contact: { max: 5, windowMs: 10 * 60 * 1000 },
  // Everything behind the link: the overview, photo uploads and sending a request.
  returnSession: { max: 60, windowMs: 10 * 60 * 1000 },
} as const;

// Cart cookie: holds a random token, the cart itself lives in our database.
export const CART_COOKIE = "palleys_cart";
export const CART_TTL_MS = 10 * 24 * 60 * 60 * 1000;

export const MAX_NOTES_LENGTH = 500;
// The team's own notepad per order in the backoffice (e.g. who picks it up, their Instagram name).
export const MAX_ADMIN_NOTES_LENGTH = 5000;

// Field limits for customer details.
export const FIELD_LIMITS = {
  name: 80,
  email: 254,
  phone: 30,
  street: 120,
  houseNumber: 20,
  city: 80,
} as const;
