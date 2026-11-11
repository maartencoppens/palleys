import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { syncOrderPayment } from "@/core/modules/payments/service";

const paramsSchema = z.object({ id: z.uuid() });

// "Betaalstatus ophalen": asks Stripe right now and processes the answer like a webhook would.
export async function POST(_request: Request, ctx: RouteContext<"/api/admin/orders/[id]/sync">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const result = await syncOrderPayment(id, `admin:${session.user.name}`, { minIntervalMs: 0 });
    if (!result) return NextResponse.json({ error: "Geen betaling gevonden voor deze order" }, { status: 404 });
    return NextResponse.json({ status: result.outcome === "processed" ? result.orderStatus : result.outcome });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    console.error("Admin payment sync failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Stripe kon niet bereikt worden" }, { status: 502 });
  }
}
