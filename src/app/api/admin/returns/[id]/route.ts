import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/core/modules/auth/service";
import { decideReturnRequest } from "@/core/modules/returns/service";
import { returnDecisionSchema } from "@/core/modules/returns/types";
import { adminReturnsErrorResponse } from "@/core/modules/returns/http";

const paramsSchema = z.object({ id: z.uuid() });

// Approve, reject (with a reason for the customer) or complete a return request.
export async function POST(request: Request, ctx: RouteContext<"/api/admin/returns/[id]">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const input = returnDecisionSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await decideReturnRequest(id, input, session.user.name));
  } catch (error) {
    return adminReturnsErrorResponse(error);
  }
}
