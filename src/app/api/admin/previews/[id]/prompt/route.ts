import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { PreviewConflictError, PreviewNotFoundError, setPromptOverride } from "@/core/modules/previews/service";
import { promptOverrideSchema } from "@/core/modules/previews/types";

const paramsSchema = z.object({ id: z.uuid() });

// The prompt for the next pose of a new collectible's model.
export async function PUT(request: Request, ctx: RouteContext<"/api/admin/previews/[id]/prompt">) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const { prompt } = promptOverrideSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await setPromptOverride(id, prompt));
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: "Vul de prompt in" }, { status: 400 });
    if (error instanceof PreviewNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (error instanceof PreviewConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
