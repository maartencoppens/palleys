import { NextResponse } from "next/server";
import { listDeliveryOptions } from "@/core/modules/checkout/service";
import { checkoutErrorResponse } from "@/core/modules/checkout/http";
import { deliveryAddressSchema } from "@/core/modules/shipping/types";
import { readCartToken } from "@/core/modules/cart/cookie";
import { assertRateLimit } from "@/core/utils/rate-limit";
import { assertSameOrigin } from "@/core/utils/request";

// Country + postal code → the delivery options we offer there, with our price. Re-checked again at checkout.
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await assertRateLimit("deliveryOptions", request.headers);
    const address = deliveryAddressSchema.parse(await request.json().catch(() => null));
    return NextResponse.json({ options: await listDeliveryOptions(await readCartToken(), address) });
  } catch (error) {
    return checkoutErrorResponse(error, "Delivery options");
  }
}
