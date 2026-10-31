import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { OrderNotFoundError, resolveOrderAttention } from "@/core/modules/orders/service";
import { resolveAttentionSchema } from "@/core/modules/orders/types";

const paramsSchema = z.object({ id: z.uuid() });

// Marks a flagged order problem as handled, with a note that ends up in the status log.
export async function POST(request: Request, ctx: RouteContext<"/api/admin/orders/[id]/resolve">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const { note } = resolveAttentionSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await resolveOrderAttention(id, note, session.user.name));
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Schrijf kort wat je gedaan hebt (min. 3 tekens)" }, { status: 400 });
    }
    if (error instanceof OrderNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
