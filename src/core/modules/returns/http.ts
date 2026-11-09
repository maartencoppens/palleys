import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "@/core/modules/auth/service";
import { RateLimitError } from "@/core/utils/rate-limit";
import { CrossOriginError } from "@/core/utils/request";
import { ReturnAccessError, ReturnActionError, ReturnNotAllowedError, ReturnNotFoundError, ReturnPhotoError } from "./service";

/** Error mapping for the customer's returns routes. Codes only: never input, never whether an order exists. */
export function returnsErrorResponse(error: unknown, context: string) {
  if (error instanceof ZodError) {
    const fields = [...new Set(error.issues.map((issue) => String(issue.path[0] ?? "")))].filter(Boolean);
    return NextResponse.json({ error: "invalid_input", fields }, { status: 400 });
  }
  if (error instanceof ReturnAccessError) return NextResponse.json({ error: "session" }, { status: 401 });
  if (error instanceof ReturnNotAllowedError) return NextResponse.json({ error: "not_allowed" }, { status: 409 });
  if (error instanceof ReturnPhotoError) return NextResponse.json({ error: "upload" }, { status: 400 });
  if (error instanceof RateLimitError) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
  }
  if (error instanceof CrossOriginError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  console.error(`${context} failed:`, error instanceof Error ? error.message : error);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}

/** The same for the backoffice. Messages meant for the admin are shown as they are. */
export function adminReturnsErrorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Ongeldige invoer" }, { status: 400 });
  if (error instanceof ReturnNotFoundError) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  if (error instanceof ReturnActionError) return NextResponse.json({ error: error.message }, { status: 409 });
  console.error("[returns]", error);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
