import { NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { InvalidCollectibleImageError, storeCollectibleImage } from "@/core/modules/collectibles/service";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/data/uploads";

// Through our server, not straight to R2: the image is resized and converted to WebP first.
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || !(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return NextResponse.json({ error: "Kies een JPG, PNG of WebP" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Deze foto is groter dan 10 MB" }, { status: 400 });
    }
    return NextResponse.json(await storeCollectibleImage(Buffer.from(await file.arrayBuffer())), { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof InvalidCollectibleImageError) {
      return NextResponse.json({ error: "Dit bestand konden we niet lezen als foto" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
