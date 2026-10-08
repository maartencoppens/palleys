import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { downloadModels } from "@/core/modules/previews/service";

const bodySchema = z.object({ previewIds: z.array(z.uuid()).min(1).max(50) });

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const { previewIds } = bodySchema.parse(
      await request.json().catch(() => null),
    );
    const files = await downloadModels(previewIds, session.user.name);
    return NextResponse.json({ files });
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
