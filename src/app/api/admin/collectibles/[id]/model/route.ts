import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import {
  CollectibleAnimalMissingError,
  CollectibleModelMissingError,
  CollectibleNotFoundError,
  getCollectibleModelDownload,
} from "@/core/modules/collectibles/service";

const paramsSchema = z.object({ id: z.uuid() });

// A short-lived download link for the collectible's print zip.
export async function POST(_request: Request, ctx: RouteContext<"/api/admin/collectibles/[id]/model">) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    return NextResponse.json(await getCollectibleModelDownload(id));
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError || error instanceof CollectibleNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (error instanceof CollectibleModelMissingError) {
      return NextResponse.json({ error: "Deze collectible heeft nog geen 3D-model" }, { status: 409 });
    }
    if (error instanceof CollectibleAnimalMissingError) {
      return NextResponse.json({ error: "Kies en bewaar eerst het dier: de download is naar de collectible genoemd" }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
