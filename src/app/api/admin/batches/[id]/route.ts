import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/core/modules/auth/service";
import { deleteBatch } from "@/core/modules/batches/service";
import { batchErrorResponse } from "@/core/modules/batches/http";

const paramsSchema = z.object({ id: z.uuid() });

// Only an empty batch that hasn't gone to JLC.
export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/batches/[id]">) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    return NextResponse.json(await deleteBatch(id));
  } catch (error) {
    return batchErrorResponse(error);
  }
}
