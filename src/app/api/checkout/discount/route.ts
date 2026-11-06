import { NextResponse } from "next/server";
import { applyCheckoutDiscount } from "@/core/modules/checkout/service";
import { checkoutErrorResponse } from "@/core/modules/checkout/http";
import { readCartToken } from "@/core/modules/cart/cookie";
import { applyDiscountSchema } from "@/core/modules/discounts/types";
import { assertRateLimit } from "@/core/utils/rate-limit";
import { assertSameOrigin } from "@/core/utils/request";

// Code → what it takes off this cart. Tight rate limit: this is the one place where codes can be guessed.
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await assertRateLimit("discount", request.headers);
    const { code } = applyDiscountSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await applyCheckoutDiscount(await readCartToken(), code));
  } catch (error) {
    return checkoutErrorResponse(error, "Discount");
  }
}
