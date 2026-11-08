import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/core/modules/auth/service";
import { removeOrderFromBatch } from "@/core/modules/batches/service";
import { batchErrorResponse } from "@/core/modules/batches/http";

const paramsSchema = z.object({ id: z.uuid(), orderId: z.uuid() });

// Back to "orders zonder batch".
export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/batches/[id]/orders/[orderId]">) {
  try {
    const session = await requireAdmin();
    const { id, orderId } = paramsSchema.parse(await ctx.params);
    return NextResponse.json(await removeOrderFromBatch(id, orderId, session.user.name));
  } catch (error) {
    return batchErrorResponse(error);
  }
}
