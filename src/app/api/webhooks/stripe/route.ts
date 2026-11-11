import { NextResponse } from "next/server";
import { paymentProvider } from "@/core/modules/payments/providers";
import { handlePaymentWebhook } from "@/core/modules/payments/service";

// Stripe posts events here (configured in the dashboard, not per payment), signed with HMAC in the `stripe-signature`
// header over the exact raw body. Even then only the Checkout Session id is used: the status is fetched again from
// Stripe's API in payments/service.ts. Events: checkout.session.completed, .async_payment_succeeded,
// .async_payment_failed, .expired, charge.refunded, charge.dispute.created.
// 200 = processed, or nothing for us (unknown session, event we don't handle) · 400 = invalid signature (Stripe
// shows it as failed; the return page and cron catch up) · 500 = our side failed, so Stripe retries.
const MAX_BODY_BYTES = 16 * 1024;

// Runs on Node.js (the default; `export const runtime` isn't allowed with cacheComponents): the SDK's signature check
// and Buffer need it.
export const maxDuration = 30;

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let paymentId: string;
  try {
    const callback = await paymentProvider.parseCallback(rawBody, request.headers);
    if (!callback.ok) {
      if (callback.ignore) {
        console.info(`[webhook:stripe] ignored: ${callback.reason}`);
        return new NextResponse(null, { status: 200 });
      }
      console.warn(`[webhook:stripe] rejected: ${callback.reason}`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
    paymentId = callback.paymentId;
  } catch (error) {
    // Looking up the session of a refund or dispute failed: let Stripe retry.
    console.error("[webhook:stripe] lookup failed:", error instanceof Error ? error.message : error);
    return new NextResponse(null, { status: 500 });
  }

  try {
    const result = await handlePaymentWebhook(paymentId);
    console.info(`[webhook:stripe] ${paymentId}: ${result.outcome}`);
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error(`[webhook:stripe] ${paymentId} failed:`, error instanceof Error ? error.message : error);
    return new NextResponse(null, { status: 500 });
  }
}
