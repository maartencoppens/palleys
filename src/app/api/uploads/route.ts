import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createUploadSchema } from "@/core/modules/previews/types";
import { createPreview } from "@/core/modules/previews/service";

export async function POST(request: Request) {
  try {
    const input = createUploadSchema.parse(await request.json());
    const result = await createPreview(input);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
