import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { InvalidTransitionError } from "@/core/modules/previews/status";
import {
  PreviewConflictError,
  PreviewNotFoundError,
  syncModel,
} from "@/core/modules/previews/service";
import { MeshyError } from "@/core/networking/external/meshy-client";

const paramsSchema = z.object({ id: z.uuid() });

export const maxDuration = 120;

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/admin/previews/[id]/sync-model">,
) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const result = await syncModel(id);
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
    if (error instanceof MeshyError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
