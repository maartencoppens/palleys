import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "@/core/modules/auth/service";
import { OrderActionError } from "@/core/modules/orders/admin";
import { BatchActionError, BatchFilesMissingError, BatchNotFoundError } from "./service";

/** Shared error mapping for the batch routes. Messages meant for the admin are shown as they are. */
export function batchErrorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof ZodError) return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  if (error instanceof BatchNotFoundError) return NextResponse.json({ error: "Deze batch bestaat niet" }, { status: 404 });
  if (error instanceof BatchFilesMissingError) {
    return NextResponse.json({ error: `Printbestand ontbreekt voor ${error.missing.join(", ")}`, missing: error.missing }, { status: 409 });
  }
  if (error instanceof BatchActionError || error instanceof OrderActionError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  console.error("[batches]", error);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
