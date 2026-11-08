import { z } from "zod";
import { requireAdmin } from "@/core/modules/auth/service";
import { buildBatchBpostFile } from "@/core/modules/batches/service";
import { batchErrorResponse } from "@/core/modules/batches/http";

const paramsSchema = z.object({ id: z.uuid() });

// The bpost CSV (or a zip of them) for the batch's home deliveries. Addresses: behind admin auth, never cached.
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/batches/[id]/bpost">) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const file = await buildBatchBpostFile(id);
    return new Response(file.bytes as BodyInit, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return batchErrorResponse(error);
  }
}
