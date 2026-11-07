import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { createModelUpload } from "@/core/modules/collectibles/service";
import { modelUploadSchema } from "@/core/modules/collectibles/types";

// A signed upload URL for a collectible's print zip. Nothing is stored until the collectible is saved with its key.
export async function POST(request: Request) {
  try {
    await requireAdmin();
    modelUploadSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await createModelUpload(), { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: "Dit bestand is groter dan 200 MB" }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
