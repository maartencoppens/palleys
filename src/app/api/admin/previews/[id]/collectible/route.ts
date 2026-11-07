import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import {
  CollectibleFromPreviewError,
  CollectibleNotFoundError,
  attachPreviewModel,
} from "@/core/modules/collectibles/service";

const paramsSchema = z.object({ id: z.uuid() });

// Copies a print-ready collectible model onto its collectible again. Happens by itself on upload; this is the retry.
export async function POST(_request: Request, ctx: RouteContext<"/api/admin/previews/[id]/collectible">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    return NextResponse.json(await attachPreviewModel(id, session.user.name), { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError || error instanceof CollectibleNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (error instanceof CollectibleFromPreviewError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
