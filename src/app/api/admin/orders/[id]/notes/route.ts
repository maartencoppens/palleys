import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { updateOrderNotes } from "@/core/modules/orders/admin";
import { OrderNotFoundError } from "@/core/modules/orders/service";
import { orderNotesSchema } from "@/core/modules/orders/types";

const paramsSchema = z.object({ id: z.uuid() });

// Saves the team's notepad on an order; an empty text clears it.
export async function PUT(request: Request, ctx: RouteContext<"/api/admin/orders/[id]/notes">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const { notes } = orderNotesSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await updateOrderNotes(id, notes, session.user.name));
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Ongeldige invoer" }, { status: 400 });
    if (error instanceof OrderNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
