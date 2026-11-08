import { NextResponse } from "next/server";
import { requireAdmin } from "@/core/modules/auth/service";
import { sendPickupUpdate } from "@/core/modules/batches/service";
import { batchErrorResponse } from "@/core/modules/batches/http";
import { pickupUpdateSchema } from "@/core/modules/batches/types";

// A message to everyone whose pickup order lies ready, about when they can come.
export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const { message } = pickupUpdateSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await sendPickupUpdate(message, session.user.name));
  } catch (error) {
    return batchErrorResponse(error);
  }
}
