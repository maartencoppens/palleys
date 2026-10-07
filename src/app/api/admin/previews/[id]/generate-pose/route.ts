import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { InvalidTransitionError } from "@/core/modules/previews/status";
import {
  generatePose,
  PreviewConflictError,
  PreviewNotFoundError,
} from "@/core/modules/previews/service";

export const maxDuration = 180;

const paramsSchema = z.object({ id: z.uuid() });

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/admin/previews/[id]/generate-pose">,
) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const result = await generatePose(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    if (error instanceof PreviewConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof InvalidTransitionError) {
      return NextResponse.json(
        { error: `Cannot generate pose in status ${error.from}` },
        { status: 409 },
      );
    }

    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
