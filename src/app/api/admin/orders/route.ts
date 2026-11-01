import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { createManualOrder, OrderActionError } from "@/core/modules/orders/admin";
import { manualOrderSchema } from "@/core/modules/orders/types";

// An order added by an admin, e.g. for a friend who doesn't go through the website.
export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const input = manualOrderSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await createManualOrder(input, session.user.name), { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      return NextResponse.json({ error: `Controleer het veld ${issue.path.join(".")}` }, { status: 400 });
    }
    if (error instanceof OrderActionError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
