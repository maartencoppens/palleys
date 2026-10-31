import { NextResponse } from "next/server";
import { paymentProvider } from "@/core/modules/payments/providers";
import { handlePaymentWebhook } from "@/core/modules/payments/service";

// Bancontact Pro posts a JSON status update, signed with a detached JWS in the `signature` header (ES256, keys
// from Bancontact's JWKS). The signature is checked over the exact raw body. Even then only the payment id is used:
// the status is fetched again from Bancontact's API in payments/service.ts.
// 200 = done (also for ids we don't know), 401 = signature invalid (no retry; the return page and cron catch up),
// 500 = our side failed, so Bancontact retries.
const MAX_BODY_BYTES = 16 * 1024;

export const maxDuration = 30;

export async function POST(request: Request) {
  console.log("[webhook:bancontact] hit");

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let paymentId: string;
  try {
    const callback = await paymentProvider.parseCallback(rawBody, request.headers);
    if (!callback.ok) {
      console.warn(`[webhook:bancontact] rejected: ${callback.reason}`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    paymentId = callback.paymentId;
  } catch (error) {
    // Usually the key set couldn't be fetched: let Bancontact retry.
    console.error("[webhook:bancontact] verification failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Verification unavailable" }, { status: 503 });
  }

  try {
    const result = await handlePaymentWebhook(paymentId);
    console.log(`[webhook:bancontact] ${paymentId}: ${result.outcome}`);
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error(`[webhook:bancontact] ${paymentId} failed:`, error instanceof Error ? error.message : error);
    return new NextResponse(null, { status: 500 });
  }
}
