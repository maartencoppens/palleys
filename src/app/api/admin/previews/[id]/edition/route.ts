import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { changePreviewEdition, OrderActionError } from "@/core/modules/orders/admin";
import { attachments, editions } from "@/data/options";

const paramsSchema = z.object({ id: z.uuid() });
const bodySchema = z.object({
  edition: z.enum(editions.map((option) => option.value) as ["keychain", "figure"]),
  attachment: z.enum(attachments.map((option) => option.value) as ["clip", "key-ring"]).nullable(),
});

// Keychain or figure (and how it hangs) changed on the customer's request, after ordering.
export async function PUT(request: Request, ctx: RouteContext<"/api/admin/previews/[id]/edition">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const input = bodySchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await changePreviewEdition(id, input, session.user.name));
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    if (error instanceof OrderActionError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
