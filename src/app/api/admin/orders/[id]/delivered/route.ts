import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/core/modules/auth/service";
import { setDeliveredOn } from "@/core/modules/returns/service";
import { deliveredOnSchema } from "@/core/modules/returns/types";
import { adminReturnsErrorResponse } from "@/core/modules/returns/http";

const paramsSchema = z.object({ id: z.uuid() });

// The day a parcel really arrived (start of the withdrawal period), or null to go back to the estimate.
export async function PUT(request: Request, ctx: RouteContext<"/api/admin/orders/[id]/delivered">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const { deliveredOn } = deliveredOnSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await setDeliveredOn(id, deliveredOn, session.user.name));
  } catch (error) {
    return adminReturnsErrorResponse(error);
  }
}
