import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import {
  PreviewConflictError,
  PreviewNotFoundError,
} from "@/core/modules/previews/service";
import { createProcessedUpload } from "@/core/modules/print-prep/service";
import { printFileUploadSchema } from "@/core/modules/print-prep/types";

const paramsSchema = z.object({ id: z.uuid() });

// Stap 1 van de upload van een verwerkte zip: signed upload-URL.
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/print-prep/[id]/upload">,
) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    printFileUploadSchema.parse(await request.json().catch(() => null));
    const result = await createProcessedUpload(id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Bestand te groot (max. 200 MB)" },
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
