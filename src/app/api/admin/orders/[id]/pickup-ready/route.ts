import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/core/modules/auth/service";
import { markReadyForPickup } from "@/core/modules/batches/service";
import { batchErrorResponse } from "@/core/modules/batches/http";

const paramsSchema = z.object({ id: z.uuid() });

// A pickup order lies ready: mark it and mail the customer, once.
export async function POST(_request: Request, ctx: RouteContext<"/api/admin/orders/[id]/pickup-ready">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    return NextResponse.json(await markReadyForPickup(id, session.user.name));
  } catch (error) {
    return batchErrorResponse(error);
  }
}
