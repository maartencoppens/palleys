import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { createDiscount, DiscountConflictError } from "@/core/modules/discounts/service";

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    return NextResponse.json(await createDiscount(await request.json().catch(() => null), session.user.name), { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    if (error instanceof DiscountConflictError) return NextResponse.json({ error: "Deze code bestaat al" }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
