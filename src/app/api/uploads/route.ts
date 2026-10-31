import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createUploadSchema } from "@/core/modules/previews/types";
import { createPreview } from "@/core/modules/previews/service";
import { assertRateLimit, RateLimitError } from "@/core/utils/rate-limit";
import { assertSameOrigin, CrossOriginError } from "@/core/utils/request";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await assertRateLimit("uploads", request.headers);
    const input = createUploadSchema.parse(await request.json());
    const result = await createPreview(input);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }
    if (error instanceof CrossOriginError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Upload failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
