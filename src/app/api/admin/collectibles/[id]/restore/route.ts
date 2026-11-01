import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { CollectibleNotFoundError, restoreCollectible } from "@/core/modules/collectibles/service";

const paramsSchema = z.object({ id: z.uuid() });

export async function POST(_request: Request, ctx: RouteContext<"/api/admin/collectibles/[id]/restore">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    return NextResponse.json(await restoreCollectible(id, session.user.name));
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    if (error instanceof CollectibleNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
