import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { OrderActionError, setItemCheckIn } from "@/core/modules/orders/admin";
import { OrderNotFoundError } from "@/core/modules/orders/service";
import { itemCheckInSchema } from "@/core/modules/orders/types";

const paramsSchema = z.object({ id: z.uuid(), itemId: z.uuid() });

export async function POST(request: Request, ctx: RouteContext<"/api/admin/orders/[id]/items/[itemId]/check-in">) {
  try {
    const session = await requireAdmin();
    const { id, itemId } = paramsSchema.parse(await ctx.params);
    const { checked } = itemCheckInSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await setItemCheckIn(id, itemId, checked, session.user.name));
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
    if (error instanceof OrderNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (error instanceof OrderActionError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
