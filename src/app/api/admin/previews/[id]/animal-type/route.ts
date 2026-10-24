import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import {
  PreviewNotFoundError,
  setAnimalType,
} from "@/core/modules/previews/service";
import { animalTypeSchema } from "@/core/modules/previews/types";

const paramsSchema = z.object({ id: z.uuid() });

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/previews/[id]/animal-type">,
) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const { animalType } = animalTypeSchema.parse(
      await request.json().catch(() => null),
    );
    const result = await setAnimalType(id, animalType);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    if (error instanceof PreviewNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
