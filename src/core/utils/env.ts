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
  SHOPIFY_STORE_DOMAIN: z.string().min(1),
  SHOPIFY_API_VERSION: z.string().min(1),
  SHOPIFY_STOREFRONT_PRIVATE_TOKEN: z.string().min(1),
  SHOPIFY_CLIENT_ID: z.string().min(1),
  SHOPIFY_CLIENT_SECRET: z.string().min(1),
  // Bancontact Pro (via KBC). One API key per payment profile, from portal.bancontactpro.com.
  // Unset = checkout shows "betalen niet beschikbaar". BANCONTACT_ENV: preprod for testing, production for real money.
  BANCONTACT_API_KEY: optional(z.string().min(16)),
  BANCONTACT_PAYMENT_PROFILE_ID: optional(z.string().min(8)), // checked against the `sub` of every signed callback
  BANCONTACT_ENV: z.enum(["preprod", "production"]).default("preprod"),
  // "fake" = fake payments to test the order flow locally without Bancontact. Ignored in production (see providers/fake.ts).
  PAYMENT_PROVIDER: optional(z.enum(["bancontact", "fake"])),
  // Resend for order mails. Unset = mails are skipped (and logged without personal data).
  RESEND_API_KEY: optional(z.string().min(1)),
  EMAIL_FROM: optional(z.string().min(3)), // e.g. "Palleys <bestellingen@palleys.be>", domain verified in Resend
  EMAIL_REPLY_TO: optional(z.email()),
  // Bearer secret for /api/cron/* (expiring unpaid orders). Unset = the cron route refuses every call.
  CRON_SECRET: optional(z.string().min(32)),
});

export const env = schema.parse(process.env);
