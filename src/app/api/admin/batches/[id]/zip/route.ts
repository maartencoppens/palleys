import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/core/modules/auth/service";
import { prepareBatchZip } from "@/core/modules/batches/service";
import { batchZipChunks, toReadableStream } from "@/core/modules/batches/zip";
import { batchErrorResponse } from "@/core/modules/batches/http";

const paramsSchema = z.object({ id: z.uuid() });

// Whether every print file is there, before the browser starts the download. 409 lists the Palleys without one.
export async function POST(_request: Request, ctx: RouteContext<"/api/admin/batches/[id]/zip">) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const { fileName } = await prepareBatchZip(id);
    return NextResponse.json({ fileName });
  } catch (error) {
    return batchErrorResponse(error);
  }
}

// The batch zip for JLC, streamed from R2 behind admin auth: print files hold customers' pets, never a public link.
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/batches/[id]/zip">) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const zip = await prepareBatchZip(id);
    return new Response(toReadableStream(batchZipChunks(zip.ref, zip.entries, zip.manifest)), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zip.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return batchErrorResponse(error);
  }
}
