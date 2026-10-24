import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { downloadModels } from "@/core/modules/previews/service";
import { MAX_DOWNLOAD_BATCH } from "@/data/admin";

const bodySchema = z.object({
  previewIds: z.array(z.uuid()).min(1).max(MAX_DOWNLOAD_BATCH),
});

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const { previewIds } = bodySchema.parse(
      await request.json().catch(() => null),
    );
    const downloads = await downloadModels(previewIds, session.user.name);
    return NextResponse.json({ downloads });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
