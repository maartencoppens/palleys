import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/core/modules/auth/service";
import { markBatchReceived, sendBatchToJlc, shipAllDeliveries } from "@/core/modules/batches/service";
import { batchErrorResponse } from "@/core/modules/batches/http";
import { batchActionSchema } from "@/core/modules/batches/types";

const paramsSchema = z.object({ id: z.uuid() });

const ACTIONS = { send_to_jlc: sendBatchToJlc, received: markBatchReceived, ship_all_deliveries: shipAllDeliveries };

// The batch's next step: sent to JLC, back from JLC, or every checked-in delivery shipped.
export async function POST(request: Request, ctx: RouteContext<"/api/admin/batches/[id]/status">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const { action } = batchActionSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await ACTIONS[action](id, session.user.name));
  } catch (error) {
    return batchErrorResponse(error);
  }
}
