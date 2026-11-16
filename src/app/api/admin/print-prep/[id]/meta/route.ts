import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { PreviewConflictError, PreviewNotFoundError } from "@/core/modules/previews/service";
import { refreshProcessedMeta } from "@/core/modules/print-prep/service";

const paramsSchema = z.object({ id: z.uuid() });

// Reads the processed zip again: size, triangles and texture, for a model uploaded before we read them.
export async function POST(_request: Request, ctx: RouteContext<"/api/admin/print-prep/[id]/meta">) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    return NextResponse.json(await refreshProcessedMeta(id));
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    if (error instanceof PreviewNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (error instanceof PreviewConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
