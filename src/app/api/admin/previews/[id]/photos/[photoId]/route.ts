import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import {
  deletePhoto,
  PreviewConflictError,
  PreviewNotFoundError,
  setPhotoInPrompt,
} from "@/core/modules/previews/service";
import { photoInPromptSchema } from "@/core/modules/previews/types";

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

// Whether this photo goes along to Nano Banana for the next pose (it stays with the preview either way).
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/previews/[id]/photos/[photoId]">) {
  try {
    await requireAdmin();
    const { id, photoId } = paramsSchema.parse(await ctx.params);
    const { inPrompt } = photoInPromptSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await setPhotoInPrompt(id, photoId, inPrompt));
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    if (error instanceof PreviewNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (error instanceof PreviewConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
