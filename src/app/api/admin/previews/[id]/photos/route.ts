import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import {
  createPhotoUpload,
  PreviewConflictError,
  PreviewNotFoundError,
} from "@/core/modules/previews/service";
import { photoInputSchema } from "@/core/modules/previews/types";

const paramsSchema = z.object({ id: z.uuid() });

// Stap 1 van een admin-upload: geeft een signed upload-URL terug.
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/previews/[id]/photos">,
) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const input = photoInputSchema.parse(await request.json().catch(() => null));
    const result = await createPhotoUpload(id, input);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Alleen JPG, PNG of WebP tot 10 MB" },
        { status: 400 },
      );
    }
    if (error instanceof PreviewNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (error instanceof PreviewConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
