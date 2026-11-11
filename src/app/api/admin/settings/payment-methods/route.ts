import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { getPaymentMethodOverview, PaymentMethodConfigError, setPaymentMethod } from "@/core/modules/payments/method-config";
import { toggleRequestSchema } from "@/core/modules/payments/method-rules";

// The payment methods Stripe Checkout offers. Read and changed at Stripe itself (payments/method-config.ts).

function errorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof ZodError) return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  if (error instanceof PaymentMethodConfigError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("[payment-methods]", error instanceof Error ? error.message : error);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ overview: await getPaymentMethodOverview() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAdmin();
    const input = toggleRequestSchema.parse(await request.json().catch(() => null));
    return NextResponse.json({ overview: await setPaymentMethod(input, session.user.name) });
  } catch (error) {
    return errorResponse(error);
  }
}
