import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { withdrawPhotoConsent } from "@/core/modules/orders/admin";
import { OrderNotFoundError } from "@/core/modules/orders/service";

const paramsSchema = z.object({ id: z.uuid() });

// The customer withdrew their consent for marketing with their photos: logged, and the photos follow the normal retention.
export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/orders/[id]/photo-consent">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    return NextResponse.json(await withdrawPhotoConsent(id, session.user.name));
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    if (error instanceof OrderNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
