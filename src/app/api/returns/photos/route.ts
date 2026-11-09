import { NextResponse } from "next/server";
import { createReturnPhotoUploads } from "@/core/modules/returns/service";
import { returnPhotoUploadSchema } from "@/core/modules/returns/types";
import { readReturnSession } from "@/core/modules/returns/cookie";
import { returnsErrorResponse } from "@/core/modules/returns/http";
import { assertRateLimit } from "@/core/utils/rate-limit";
import { assertSameOrigin } from "@/core/utils/request";

// Signed upload URLs for a warranty claim's photos (private in R2, same limits as the pet photos).
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await assertRateLimit("returnSession", request.headers);
    const input = returnPhotoUploadSchema.parse(await request.json().catch(() => null));
    return NextResponse.json({ uploads: await createReturnPhotoUploads(await readReturnSession(), input) }, { status: 201 });
  } catch (error) {
    return returnsErrorResponse(error, "Return photos");
  }
}
