import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { handleOrderPaidWebhook } from "@/core/modules/orders/service";
import { ShopifyWebhookAuthError } from "@/core/networking/external/shopify-client";

// Shopify expects a 2xx within a few seconds and retries otherwise, so we only do DB work here.
export async function POST(request: Request) {
  // The HMAC is computed over the exact bytes, so read the raw body before parsing.
  const rawBody = await request.text();

  try {
    const result = await handleOrderPaidWebhook({
      rawBody,
      hmac: request.headers.get("x-shopify-hmac-sha256"),
    });
    return NextResponse.json({ ok: true, paid: result.paid.length });
  } catch (error) {
    if (error instanceof ShopifyWebhookAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError || error instanceof SyntaxError) {
      // A payload we can't read won't get better on retry.
      console.error("Shopify orders/paid: unreadable payload");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    console.error(
      "Shopify orders/paid failed:",
      error instanceof Error ? error.message : error,
    );
    // 500 makes Shopify retry later.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
