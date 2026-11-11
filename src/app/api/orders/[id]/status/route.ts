import { NextResponse } from "next/server";
import { getOrderStatusForCustomer } from "@/core/modules/orders/service";
import { cancelOpenOrderPayment, syncOrderPayment } from "@/core/modules/payments/service";
import { assertRateLimit, RateLimitError } from "@/core/utils/rate-limit";

// Polled by the return page. Answers with the status and order number only, protected by the token from the
// redirect URL. While the order waits for payment it asks Stripe directly (throttled), so local development
// works without a public callback. The redirect itself is never taken as proof of payment.
export async function GET(request: Request, ctx: RouteContext<"/api/orders/[id]/status">) {
  try {
    await assertRateLimit("orderStatus", request.headers);
    const { id } = await ctx.params;
    const query = new URL(request.url).searchParams;
    const token = query.get("t");
    // Back from the payment page through "cancel": close the open payment so it can't be paid next to a new attempt.
    const cancelled = query.get("cancelled") === "1";

    let status = await getOrderStatusForCustomer(id, token);
    if (!status) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (status.status === "PENDING_PAYMENT") {
      try {
        if (!cancelled || !(await cancelOpenOrderPayment(id))) await syncOrderPayment(id, "return-page");
        status = (await getOrderStatusForCustomer(id, token)) ?? status;
      } catch (error) {
        // Stripe unreachable: the webhook or a next poll will catch up.
        console.error("[orders] status sync failed:", error instanceof Error ? error.message : error);
      }
    }
    return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }
    console.error("Order status failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
