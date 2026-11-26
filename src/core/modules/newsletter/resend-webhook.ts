import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/*
 * Resend signs webhooks the Svix way: HMAC-SHA256 with the base64 part of the whsec_ secret over
 * "{svix-id}.{svix-timestamp}.{raw body}", sent as a space-separated list of "v1,<base64>" in svix-signature.
 */

// A message older or newer than this is refused, so a captured one can't be replayed later.
const TOLERANCE_SECONDS = 5 * 60;

export function verifyResendWebhook(rawBody: string, headers: Headers, secret: string, now = Date.now()) {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature");
  if (!id || !timestamp || !signatures || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();
  return signatures.split(" ").some((entry) => {
    const [version, signature] = entry.split(",");
    if (version !== "v1" || !signature) return false;
    const given = Buffer.from(signature, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

// Only what we act on: other fields and other events (emails, domains) pass through untouched.
export const contactEventSchema = z.object({
  type: z.string(),
  data: z.object({ email: z.string().optional(), unsubscribed: z.boolean().optional() }).optional(),
});

/** The address that may no longer get broadcasts, from an unsubscribe or a deleted contact. Null = nothing to do. */
export function unsubscribedEmail(event: z.infer<typeof contactEventSchema>) {
  const email = event.data?.email?.trim().toLowerCase();
  if (!email) return null;
  if (event.type === "contact.deleted") return email;
  if ((event.type === "contact.updated" || event.type === "contact.created") && event.data?.unsubscribed === true) return email;
  return null;
}
