import { NextResponse } from "next/server";
import { env } from "@/core/utils/env";
import { markUnsubscribed } from "@/core/modules/newsletter/service";
import { contactEventSchema, unsubscribedEmail, verifyResendWebhook } from "@/core/modules/newsletter/resend-webhook";

// Resend posts contact events here (Resend → Webhooks, events contact.updated and contact.deleted), signed with
// RESEND_WEBHOOK_SECRET. Someone who unsubscribes through a broadcast's link, or a contact deleted in Resend, is taken
// off our list too, so a later sync never signs them up again. Subscribing only ever happens through our checkout.
// 200 = processed or nothing for us · 401 = unsigned or wrong signature · 500 = our side failed, so Resend retries.
const MAX_BODY_BYTES = 16 * 1024;

export const maxDuration = 30;

export async function POST(request: Request) {
  if (!env.RESEND_WEBHOOK_SECRET) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  if (!verifyResendWebhook(rawBody, request.headers, env.RESEND_WEBHOOK_SECRET)) {
    console.warn("[webhook:resend] rejected: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event;
  try {
    event = contactEventSchema.parse(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const email = unsubscribedEmail(event);
  if (!email) return new NextResponse(null, { status: 200 });

  try {
    const changed = await markUnsubscribed(email);
    console.info(`[webhook:resend] ${event.type}: ${changed ? "unsubscribed" : "already off the list"}`);
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("[webhook:resend] failed:", error instanceof Error ? error.message : error);
    return new NextResponse(null, { status: 500 });
  }
}
