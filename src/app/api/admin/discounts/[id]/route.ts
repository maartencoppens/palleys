import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import {
  deleteDiscount,
  DiscountConflictError,
  DiscountInUseError,
  DiscountNotFoundError,
  updateDiscount,
} from "@/core/modules/discounts/service";

const paramsSchema = z.object({ id: z.uuid() });

function handleError(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
  if (error instanceof DiscountNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (error instanceof DiscountConflictError) return NextResponse.json({ error: "Deze code bestaat al" }, { status: 409 });
  if (error instanceof DiscountInUseError) {
    return NextResponse.json({ error: "Deze code is al gebruikt in een order. Zet hem uit in plaats van hem te verwijderen." }, { status: 409 });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

export async function PUT(request: Request, ctx: RouteContext<"/api/admin/discounts/[id]">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    return NextResponse.json(await updateDiscount(id, await request.json().catch(() => null), session.user.name));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/discounts/[id]">) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    return NextResponse.json(await deleteDiscount(id));
  } catch (error) {
    return handleError(error);
  }
}
