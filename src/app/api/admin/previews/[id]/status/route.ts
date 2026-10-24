import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import {
  overrideStatus,
  PreviewConflictError,
  PreviewNotFoundError,
} from "@/core/modules/previews/service";
import { statusOverrideSchema } from "@/core/modules/previews/types";

const paramsSchema = z.object({ id: z.uuid() });

// Noodknop: status handmatig aanpassen, met verplichte reden.
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/previews/[id]/status">,
) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const input = statusOverrideSchema.parse(
      await request.json().catch(() => null),
    );
    const result = await overrideStatus(id, input, session.user.name);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Kies een status en geef een reden (min. 3 tekens)" },
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
