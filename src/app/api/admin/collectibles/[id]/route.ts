import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import {
  archiveCollectible,
  CollectibleDeleteError,
  CollectibleModelMissingError,
  CollectibleNotFoundError,
  deleteCollectiblePermanently,
  updateCollectible,
} from "@/core/modules/collectibles/service";
import { collectibleInputSchema } from "@/core/modules/collectibles/types";

const paramsSchema = z.object({ id: z.uuid() });

function handleError(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
  if (error instanceof CollectibleNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (error instanceof CollectibleDeleteError) return NextResponse.json({ error: error.message }, { status: 409 });
  if (error instanceof CollectibleModelMissingError) {
    return NextResponse.json({ error: "Het 3D-model is niet goed aangekomen. Upload het opnieuw." }, { status: 409 });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

export async function PUT(request: Request, ctx: RouteContext<"/api/admin/collectibles/[id]">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const input = collectibleInputSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await updateCollectible(id, input, session.user.name));
  } catch (error) {
    return handleError(error);
  }
}

// Removing archives (it can be put back); ?permanent=1 on an archived one deletes it for good.
export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/collectibles/[id]">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    if (new URL(request.url).searchParams.get("permanent") === "1") return NextResponse.json(await deleteCollectiblePermanently(id));
    return NextResponse.json(await archiveCollectible(id, session.user.name));
  } catch (error) {
    return handleError(error);
  }
}
