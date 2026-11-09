import { NextResponse } from "next/server";
import { openReturnSession } from "@/core/modules/returns/service";
import { returnSessionSchema } from "@/core/modules/returns/types";
import { writeReturnSession } from "@/core/modules/returns/cookie";
import { returnsErrorResponse } from "@/core/modules/returns/http";
import { assertRateLimit } from "@/core/utils/rate-limit";
import { assertSameOrigin } from "@/core/utils/request";

// Spends the link from the mail and opens a short session (cookie) on the order.
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await assertRateLimit("returnSession", request.headers);
    const { token } = returnSessionSchema.parse(await request.json().catch(() => null));
    const { sessionToken, overview } = await openReturnSession(token, new URL(request.url).searchParams.get("locale"));
    await writeReturnSession(sessionToken);
    return NextResponse.json(overview);
  } catch (error) {
    return returnsErrorResponse(error, "Return session");
  }
}
