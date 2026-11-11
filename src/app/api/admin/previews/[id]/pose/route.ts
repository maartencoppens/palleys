import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import {
  InvalidPoseImageError,
  PreviewConflictError,
  PreviewNotFoundError,
  uploadPose,
} from "@/core/modules/previews/service";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/data/uploads";

const paramsSchema = z.object({ id: z.uuid() });

// A pose made elsewhere, next to the generated attempts. Through our server: it's converted to PNG first.
export async function POST(request: Request, ctx: RouteContext<"/api/admin/previews/[id]/pose">) {
  try {
    const session = await requireAdmin();
    const params = paramsSchema.safeParse(await ctx.params);
    if (!params.success) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || !(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return NextResponse.json({ error: "Kies een JPG, PNG of WebP" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Deze afbeelding is groter dan 10 MB" }, { status: 400 });
    return NextResponse.json(await uploadPose(params.data.id, Buffer.from(await file.arrayBuffer()), session.user.name));
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof PreviewNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (error instanceof PreviewConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof InvalidPoseImageError) {
      return NextResponse.json({ error: "Dit bestand konden we niet lezen als afbeelding" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
