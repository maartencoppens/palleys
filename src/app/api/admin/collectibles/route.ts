import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { CollectibleModelMissingError, createCollectible } from "@/core/modules/collectibles/service";
import { collectibleInputSchema } from "@/core/modules/collectibles/types";

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const input = collectibleInputSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await createCollectible(input, session.user.name), { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    if (error instanceof CollectibleModelMissingError) {
      return NextResponse.json({ error: "Het 3D-model is niet goed aangekomen. Upload het opnieuw." }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
