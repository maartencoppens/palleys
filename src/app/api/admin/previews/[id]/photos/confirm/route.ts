import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import {
  confirmPhotoUpload,
  PreviewConflictError,
  PreviewNotFoundError,
} from "@/core/modules/previews/service";
import { confirmPhotoSchema } from "@/core/modules/previews/types";

const paramsSchema = z.object({ id: z.uuid() });

// Stap 2 van een admin-upload: het bestand staat in R2, sla de foto op.
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/previews/[id]/photos/confirm">,
) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const { key } = confirmPhotoSchema.parse(
      await request.json().catch(() => null),
    );
    const result = await confirmPhotoUpload(id, key, session.user.name);
    return NextResponse.json(result, { status: 201 });
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
