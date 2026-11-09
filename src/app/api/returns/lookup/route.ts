import { after, NextResponse } from "next/server";
import { requestReturnLink } from "@/core/modules/returns/service";
import { returnLookupSchema } from "@/core/modules/returns/types";
import { returnsErrorResponse } from "@/core/modules/returns/http";
import { assertRateLimit } from "@/core/utils/rate-limit";
import { assertSameOrigin } from "@/core/utils/request";

// Order number + e-mail → a one-time link by mail. Always the same answer, sent before the lookup even runs.
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await assertRateLimit("returnLookup", request.headers);
    const input = returnLookupSchema.parse(await request.json().catch(() => null));
    after(() => requestReturnLink(input).catch((error) => console.error("[returns] lookup failed:", error instanceof Error ? error.message : error)));
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    return returnsErrorResponse(error, "Return lookup");
  }
}
