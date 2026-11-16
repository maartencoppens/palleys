import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { BatchActionError, forwardOrderToStep } from "@/core/modules/batches/service";
import { orderStepSchema } from "@/core/modules/batches/types";

const paramsSchema = z.object({ id: z.uuid() });

// Emergency button: a whole order to a later step (batch, JLC, post-production, finished), with a required reason.
export async function POST(request: Request, ctx: RouteContext<"/api/admin/orders/[id]/step">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const input = orderStepSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await forwardOrderToStep(id, input, session.user.name));
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: "Kies een stap en geef een reden (min. 3 tekens)" }, { status: 400 });
    if (error instanceof BatchActionError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
