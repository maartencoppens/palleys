import { NextResponse } from "next/server";
import { readCollectibleImage } from "@/core/modules/collectibles/service";

// Public product photos. A replaced photo gets a new file name, so a file never changes and can be cached for good.
export async function GET(_request: Request, ctx: RouteContext<"/api/collectibles/images/[file]">) {
  const { file } = await ctx.params;
  const image = await readCollectibleImage(file);
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(new Uint8Array(image), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
