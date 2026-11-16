import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { CollectibleModelMissingError, CollectibleNotFoundError, getCollectibleModels, putCollectibleModelVersion } from "@/core/modules/collectibles/service";
import { isCollectibleModelKey } from "@/core/modules/collectibles/utils";

const paramsSchema = z.object({ id: z.uuid() });
const bodySchema = z.object({
  modelKey: z.string().refine(isCollectibleModelKey),
  modelFileName: z.string().trim().max(200).nullable().default(null),
  activate: z.boolean().default(false),
});

function handleError(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof ZodError) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  if (error instanceof CollectibleNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (error instanceof CollectibleModelMissingError) {
    return NextResponse.json({ error: "Het 3D-model is niet goed aangekomen. Upload het opnieuw." }, { status: 409 });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

// The model versions of a collectible and the generations under way.
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/collectibles/[id]/models">) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    return NextResponse.json(await getCollectibleModels(id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleError(error);
  }
}

// An uploaded print zip (already in R2 through a signed URL) becomes a new version, and optionally the one in use.
export async function POST(request: Request, ctx: RouteContext<"/api/admin/collectibles/[id]/models">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const input = bodySchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await putCollectibleModelVersion(id, input, session.user.name), { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
