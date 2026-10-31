import { NextResponse } from "next/server";
import { env } from "@/core/utils/env";
import { secretsMatch } from "@/core/utils/tokens";
import { expireStaleOrders } from "@/core/modules/payments/service";
import { deleteExpiredCarts } from "@/core/modules/cart/service";
import { deleteExpiredRateLimits } from "@/core/utils/rate-limit";

// Run every ~15 minutes from the VPS, e.g.:
//   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://palleys.be/api/cron/expire-orders
// Checks unpaid orders at Bancontact and closes them, and clears expired carts and rate-limit rows.
export const maxDuration = 60;

export async function POST(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!env.CRON_SECRET || !secretsMatch(bearer, env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const orders = await expireStaleOrders();
    const [carts, rateLimits] = await Promise.all([deleteExpiredCarts(), deleteExpiredRateLimits()]);
    console.info("[cron] expire-orders", { ...orders, carts, rateLimits });
    return NextResponse.json({ ok: true, ...orders, carts, rateLimits });
  } catch (error) {
    console.error("[cron] expire-orders failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
