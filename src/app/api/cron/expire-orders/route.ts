import { NextResponse } from "next/server";
import { env } from "@/core/utils/env";
import { secretsMatch } from "@/core/utils/tokens";
import { expireStaleOrders } from "@/core/modules/payments/service";
import { deleteExpiredCarts } from "@/core/modules/cart/service";
import { deleteExpiredRateLimits } from "@/core/utils/rate-limit";
import { deleteExpiredReturnAccess } from "@/core/modules/returns/service";
import { applyRetention } from "@/core/modules/retention/service";

// Run every ~15 minutes from the VPS, e.g.:
//   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://palleys.be/api/cron/expire-orders
// Checks unpaid orders at Stripe and closes them, clears expired carts, rate-limit rows and /retour links, and deletes
// photos and models whose retention period (privacy policy, art. 6) is over.
export const maxDuration = 60;

export async function POST(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!env.CRON_SECRET || !secretsMatch(bearer, env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const orders = await expireStaleOrders();
    const [carts, rateLimits, returnLinks] = await Promise.all([deleteExpiredCarts(), deleteExpiredRateLimits(), deleteExpiredReturnAccess()]);
    const retention = await applyRetention();
    console.info("[cron] expire-orders", { ...orders, carts, rateLimits, returnLinks, retention });
    return NextResponse.json({ ok: true, ...orders, carts, rateLimits, returnLinks, retention });
  } catch (error) {
    console.error("[cron] expire-orders failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
