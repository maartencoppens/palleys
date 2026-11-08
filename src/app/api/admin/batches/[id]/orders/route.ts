import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/core/modules/auth/service";
import { addOrdersToBatch } from "@/core/modules/batches/service";
import { batchErrorResponse } from "@/core/modules/batches/http";
import { batchOrdersSchema } from "@/core/modules/batches/types";

const paramsSchema = z.object({ id: z.uuid() });

export async function POST(request: Request, ctx: RouteContext<"/api/admin/batches/[id]/orders">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const { orderIds } = batchOrdersSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await addOrdersToBatch(id, orderIds, session.user.name));
  } catch (error) {
    return batchErrorResponse(error);
  }
}
