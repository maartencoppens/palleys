import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import {
  deletePhoto,
  PreviewConflictError,
  PreviewNotFoundError,
} from "@/core/modules/previews/service";

const paramsSchema = z.object({ id: z.uuid(), photoId: z.uuid() });

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/admin/previews/[id]/photos/[photoId]">,
) {
  try {
    await requireAdmin();
    const { id, photoId } = paramsSchema.parse(await ctx.params);
    const result = await deletePhoto(id, photoId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
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
