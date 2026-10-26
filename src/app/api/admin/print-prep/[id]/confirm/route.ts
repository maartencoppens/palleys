import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import {
  PreviewConflictError,
  PreviewNotFoundError,
} from "@/core/modules/previews/service";
import { InvalidTransitionError } from "@/core/modules/previews/status";
import { confirmProcessedUpload } from "@/core/modules/print-prep/service";
import { confirmPrintFileSchema } from "@/core/modules/print-prep/types";

const paramsSchema = z.object({ id: z.uuid() });

// Stap 2: de zip staat in R2, model wordt "Klaar voor print".
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/print-prep/[id]/confirm">,
) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const { key } = confirmPrintFileSchema.parse(
      await request.json().catch(() => null),
    );
    const result = await confirmProcessedUpload(id, key, session.user.name);
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
    if (
      error instanceof PreviewConflictError ||
      error instanceof InvalidTransitionError
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
