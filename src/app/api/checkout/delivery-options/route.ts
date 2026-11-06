import { NextResponse } from "next/server";
import { z } from "zod";
import { enteredDiscountCodeSchema } from "@/core/modules/discounts/types";
import { listDeliveryOptions } from "@/core/modules/checkout/service";
import { checkoutErrorResponse } from "@/core/modules/checkout/http";
import { deliveryAddressSchema } from "@/core/modules/shipping/types";
import { readCartToken } from "@/core/modules/cart/cookie";
import { assertRateLimit } from "@/core/utils/rate-limit";
import { assertSameOrigin } from "@/core/utils/request";

// Where it's going, and a discount code if there is one → the delivery options, with our price. Re-checked again at checkout.
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await assertRateLimit("deliveryOptions", request.headers);
    const body = await request.json().catch(() => null);
    const address = deliveryAddressSchema.parse(body);
    const { discountCode } = z.object({ discountCode: enteredDiscountCodeSchema.optional() }).parse(body);
    return NextResponse.json({ options: await listDeliveryOptions(await readCartToken(), address, discountCode) });
  } catch (error) {
    return checkoutErrorResponse(error, "Delivery options");
  }
}
