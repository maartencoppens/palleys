import { NextResponse } from "next/server";
import { env } from "@/core/utils/env";
import { isValidSendcloudSignature } from "@/core/modules/shipping/sendcloud/signature";
import { handleSendcloudWebhook } from "@/core/modules/shipping/sendcloud/service";

// Sendcloud posts parcel status updates here (Settings > Integrations > your API integration > Webhook url).
// It wants a 2xx within 10 seconds. 401 = bad signature and 400 = unreadable: Sendcloud doesn't retry those.
// 500/503 = our side failed or isn't set up, and Sendcloud retries (up to 10 times in about 1.5 hours).
const MAX_BODY_BYTES = 64 * 1024;

export const maxDuration = 10;

export async function POST(request: Request) {
  const secret = env.SENDCLOUD_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook:sendcloud] SENDCLOUD_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  if (!isValidSendcloudSignature(rawBody, request.headers.get("sendcloud-signature"), secret)) {
    console.warn("[webhook:sendcloud] rejected: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await handleSendcloudWebhook(payload);
    console.log(`[webhook:sendcloud] ${result.outcome === "other_action" ? `action ${result.action}` : result.outcome}`);
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("[webhook:sendcloud] failed:", error instanceof Error ? error.message : error);
    return new NextResponse(null, { status: 500 });
  }
}

// So the URL can be checked in a browser while setting it up. No data.
export function GET() {
  return NextResponse.json({ ok: true, service: "sendcloud-webhook", configured: Boolean(env.SENDCLOUD_WEBHOOK_SECRET) });
}
