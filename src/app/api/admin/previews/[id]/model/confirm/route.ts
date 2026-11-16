import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { confirmOwnModelUpload, PreviewConflictError, PreviewNotFoundError } from "@/core/modules/previews/service";
import { InvalidModelZipError } from "@/core/modules/previews/model-zip";
import { confirmOwnModelSchema } from "@/core/modules/previews/types";

const paramsSchema = z.object({ id: z.uuid() });

// Step 2: the zip is in R2. Its files are checked and stored, and the preview carries on after Meshy.
export async function POST(request: Request, ctx: RouteContext<"/api/admin/previews/[id]/model/confirm">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const input = confirmOwnModelSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await confirmOwnModelUpload(id, input, session.user.name));
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    if (error instanceof PreviewNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (error instanceof InvalidModelZipError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof PreviewConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
