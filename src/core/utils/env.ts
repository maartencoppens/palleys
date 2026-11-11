import "server-only";
import { z } from "zod";

// Unset and empty ("KEY=" in .env) both mean "not configured".
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL_CA: z.string().min(1).optional(),
  R2_ENDPOINT: z.url(),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-3-pro-image"),
  MESHY_API_KEY: z.string().min(1),
  MESHY_WEBHOOK_SECRET: z.string().min(32),
  // Publieke basis-URL van de app, voor webhooks. Bewust los van BETTER_AUTH_URL.
  APP_URL: z.url().transform((url) => url.replace(/\/+$/, "")),
  // Stripe (hosted Checkout). Unset = checkout shows "betalen niet beschikbaar". Test- and live-mode each have their own
  // keys and their own payment method configuration (pmc_…). Restricted keys (rk_…) work too, with the rights in the README.
  STRIPE_SECRET: optional(z.string().regex(/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/, "expected sk_test_…, sk_live_…, rk_test_… or rk_live_…")),
  // Signs the webhooks to /api/webhooks/stripe: from `stripe listen` locally, from the dashboard endpoint in production.
  STRIPE_WEBHOOK_SECRET: optional(z.string().regex(/^whsec_[A-Za-z0-9]+$/, "expected whsec_…")),
  // Which payment methods Checkout offers (Bancontact, iDEAL | Wero, …), managed under /admin/settings/payment-methods.
  STRIPE_PAYMENT_METHOD_CONFIG: optional(z.string().regex(/^pmc_[A-Za-z0-9]+$/, "expected pmc_…")),
  // STRIPE_PUBLIC (pk_…) is deliberately not read: hosted Checkout doesn't need it.
  // "fake" = fake payments to test the order flow locally without Stripe. Ignored in production (see providers/fake.ts).
  PAYMENT_PROVIDER: optional(z.enum(["stripe", "fake"])),
  // Resend for order mails. Unset = mails are skipped (and logged without personal data).
  RESEND_API_KEY: optional(z.string().min(1)),
  EMAIL_FROM: optional(z.string().min(3)), // e.g. "Palleys <bestellingen@palleys.be>", domain verified in Resend
  EMAIL_REPLY_TO: optional(z.email()),
  // Bearer secret for /api/cron/* (expiring unpaid orders). Unset = the cron route refuses every call.
  CRON_SECRET: optional(z.string().min(32)),
});

export const env = schema.parse(process.env);
