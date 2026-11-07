import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { CollectibleFromPreviewError, startCollectibleGeneration } from "@/core/modules/collectibles/service";
import { generateCollectibleSchema } from "@/core/modules/collectibles/types";

// A new collectible's model, apart from any order. The browser uploads the photos to the returned preview next.
export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const input = generateCollectibleSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await startCollectibleGeneration(input, session.user.name), { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: "Vul de prompt in" }, { status: 400 });
    if (error instanceof CollectibleFromPreviewError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
