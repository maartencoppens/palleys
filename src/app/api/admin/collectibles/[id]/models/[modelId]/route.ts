import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import {
  CollectibleDeleteError,
  CollectibleNotFoundError,
  deleteCollectibleModel,
  refreshCollectibleModelMeta,
  selectCollectibleModel,
} from "@/core/modules/collectibles/service";

const paramsSchema = z.object({ id: z.uuid(), modelId: z.uuid() });

function handleError(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof ZodError || error instanceof CollectibleNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (error instanceof CollectibleDeleteError) return NextResponse.json({ error: error.message }, { status: 409 });
  console.error(error);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

// This version becomes the model every order of the collectible uses.
export async function PUT(_request: Request, ctx: RouteContext<"/api/admin/collectibles/[id]/models/[modelId]">) {
  try {
    const session = await requireAdmin();
    const { id, modelId } = paramsSchema.parse(await ctx.params);
    return NextResponse.json(await selectCollectibleModel(id, modelId, session.user.name));
  } catch (error) {
    return handleError(error);
  }
}

// Deletes a version that isn't in use.
export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/collectibles/[id]/models/[modelId]">) {
  try {
    await requireAdmin();
    const { id, modelId } = paramsSchema.parse(await ctx.params);
    return NextResponse.json(await deleteCollectibleModel(id, modelId));
  } catch (error) {
    return handleError(error);
  }
}

// Reads the version's zip again: size, triangles and texture.
export async function POST(_request: Request, ctx: RouteContext<"/api/admin/collectibles/[id]/models/[modelId]">) {
  try {
    await requireAdmin();
    const { id, modelId } = paramsSchema.parse(await ctx.params);
    return NextResponse.json(await refreshCollectibleModelMeta(id, modelId));
  } catch (error) {
    return handleError(error);
  }
}
