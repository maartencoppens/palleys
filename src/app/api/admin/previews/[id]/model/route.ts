import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { createOwnModelUpload, PreviewConflictError, PreviewNotFoundError } from "@/core/modules/previews/service";
import { ownModelUploadSchema } from "@/core/modules/previews/types";

const paramsSchema = z.object({ id: z.uuid() });

// Step 1 of an own 3D model (a zip with OBJ + MTL + texture): a signed upload URL straight to R2.
export async function POST(request: Request, ctx: RouteContext<"/api/admin/previews/[id]/model">) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const { printReady } = ownModelUploadSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await createOwnModelUpload(id, printReady), { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: "Bestand te groot (max. 200 MB)" }, { status: 400 });
    if (error instanceof PreviewNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (error instanceof PreviewConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
