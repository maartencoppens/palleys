import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { OrderActionError } from "@/core/modules/orders/admin";
import { deleteOrder, updateOrderDetails } from "@/core/modules/orders/maintenance";
import { OrderNotFoundError } from "@/core/modules/orders/service";
import { deleteOrderSchema, orderDetailsSchema } from "@/core/modules/orders/types";

const paramsSchema = z.object({ id: z.uuid() });

function handleError(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Ongeldige invoer" }, { status: 400 });
  if (error instanceof OrderNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (error instanceof OrderActionError) return NextResponse.json({ error: error.message }, { status: 409 });
  console.error(error);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

// Corrects the customer's details, address, tracking code or line notes.
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/orders/[id]">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const input = orderDetailsSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await updateOrderDetails(id, input, session.user.name));
  } catch (error) {
    return handleError(error);
  }
}

// Removes an order for good (test orders). Needs the typed order number and a reason.
export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/orders/[id]">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const input = deleteOrderSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await deleteOrder(id, input, session.user.name));
  } catch (error) {
    return handleError(error);
  }
}
