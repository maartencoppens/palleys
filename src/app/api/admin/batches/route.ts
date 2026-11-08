import { NextResponse } from "next/server";
import { requireAdmin } from "@/core/modules/auth/service";
import { createBatch } from "@/core/modules/batches/service";
import { batchErrorResponse } from "@/core/modules/batches/http";
import { batchOrdersSchema } from "@/core/modules/batches/types";

// A new batch with the chosen orders.
export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const { orderIds } = batchOrdersSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await createBatch(orderIds, session.user.name), { status: 201 });
  } catch (error) {
    return batchErrorResponse(error);
  }
}
