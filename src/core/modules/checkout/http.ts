import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RateLimitError } from "@/core/utils/rate-limit";
import { CrossOriginError } from "@/core/utils/request";
import { CheckoutError, type CheckoutErrorCode } from "./service";

const STATUS: Record<CheckoutErrorCode, number> = {
  checkout_closed: 503,
  payments_unavailable: 503,
  cart_empty: 409,
  preview_not_orderable: 409,
  delivery_option_invalid: 409,
  address_required: 400,
  discount_invalid: 409,
  discount_min_subtotal: 409,
  total_changed: 409,
  payment_failed: 502,
};

/** Shared error mapping for the public checkout routes. Never echoes input or internal messages. */
export function checkoutErrorResponse(error: unknown, context: string) {
  if (error instanceof ZodError) {
    // Field names only, so the form can point at them; no values.
    const fields = [...new Set(error.issues.map((issue) => String(issue.path[0] ?? "")))].filter(Boolean);
    return NextResponse.json({ error: "invalid_input", fields }, { status: 400 });
  }
  if (error instanceof CheckoutError) {
    return NextResponse.json({ error: error.code, ...error.details }, { status: STATUS[error.code] });
  }
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
    );
  }
  if (error instanceof CrossOriginError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  console.error(`${context} failed:`, error instanceof Error ? error.message : error);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
