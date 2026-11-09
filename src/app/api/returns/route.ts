import { NextResponse } from "next/server";
import { getReturnOverview, submitReturnRequest } from "@/core/modules/returns/service";
import { returnSubmitSchema } from "@/core/modules/returns/types";
import { readReturnSession } from "@/core/modules/returns/cookie";
import { returnsErrorResponse } from "@/core/modules/returns/http";
import { assertRateLimit } from "@/core/utils/rate-limit";
import { assertSameOrigin } from "@/core/utils/request";

const localeOf = (request: Request) => new URL(request.url).searchParams.get("locale");

// The order behind the session cookie, with what each item allows.
export async function GET(request: Request) {
  try {
    await assertRateLimit("returnSession", request.headers);
    return NextResponse.json(await getReturnOverview(await readReturnSession(), localeOf(request)));
  } catch (error) {
    return returnsErrorResponse(error, "Return overview");
  }
}

// Sends a cancellation, withdrawal or warranty claim. The answer is the acknowledgement of receipt.
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await assertRateLimit("returnSession", request.headers);
    const input = returnSubmitSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await submitReturnRequest(await readReturnSession(), input, localeOf(request)), { status: 201 });
  } catch (error) {
    return returnsErrorResponse(error, "Return request");
  }
}
