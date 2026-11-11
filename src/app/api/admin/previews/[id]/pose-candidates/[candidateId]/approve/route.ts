import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { InvalidTransitionError } from "@/core/modules/previews/status";
import { approvePoseCandidate, PreviewConflictError, PreviewNotFoundError } from "@/core/modules/previews/service";
import { MeshyError } from "@/core/networking/external/meshy-client";

const paramsSchema = z.object({ id: z.uuid(), candidateId: z.uuid() });

// Approves one pose out of all the attempts: it becomes the current pose and Meshy makes the 3D model from it.
export async function POST(_request: Request, ctx: RouteContext<"/api/admin/previews/[id]/pose-candidates/[candidateId]/approve">) {
  try {
    const session = await requireAdmin();
    const { id, candidateId } = paramsSchema.parse(await ctx.params);
    return NextResponse.json(await approvePoseCandidate(id, candidateId, session.user.name));
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    if (error instanceof PreviewNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (error instanceof PreviewConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof InvalidTransitionError) {
      return NextResponse.json({ error: `Een pose goedkeuren kan niet in status ${error.from}` }, { status: 409 });
    }
    if (error instanceof MeshyError) return NextResponse.json({ error: error.message }, { status: 502 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
