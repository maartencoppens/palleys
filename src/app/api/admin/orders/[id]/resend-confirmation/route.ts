import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { resendConfirmation } from "@/core/modules/payments/service";

const paramsSchema = z.object({ id: z.uuid() });

export async function POST(_request: Request, ctx: RouteContext<"/api/admin/orders/[id]/resend-confirmation">) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    return NextResponse.json({ sent: await resendConfirmation(id) });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    console.error("Resend confirmation failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
