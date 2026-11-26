import { after, NextResponse } from "next/server";
import { checkoutSchema } from "@/core/modules/checkout/types";
import { getCheckoutConfig, startCheckout } from "@/core/modules/checkout/service";
import { checkoutErrorResponse } from "@/core/modules/checkout/http";
import { readCartToken } from "@/core/modules/cart/cookie";
import { assertRateLimit } from "@/core/utils/rate-limit";
import { assertSameOrigin } from "@/core/utils/request";
import { syncSubscriberToResend } from "@/core/modules/newsletter/service";
import { maskEmail } from "@/core/modules/orders/utils";

// Whether the checkout is open and payments are configured, so the form can say so before anyone types.
export async function GET() {
  try {
    return NextResponse.json(await getCheckoutConfig());
  } catch (error) {
    return checkoutErrorResponse(error, "Checkout config");
  }
}

// Customer details + delivery option + terms → order + Stripe Checkout Session → { checkoutUrl } (hosted payment page).
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await assertRateLimit("checkout", request.headers);
    const input = checkoutSchema.parse(await request.json().catch(() => null));
    const result = await startCheckout(await readCartToken(), input);
    // Ticked "keep me posted": into Resend after the response, so the customer never waits on it.
    if (input.marketingOptIn) {
      after(() =>
        syncSubscriberToResend(input.email, { freshConsent: true }).catch((error) =>
          console.error(`[newsletter] Resend sync failed for ${maskEmail(input.email)}:`, error instanceof Error ? error.message : error),
        ),
      );
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return checkoutErrorResponse(error, "Checkout");
  }
}
