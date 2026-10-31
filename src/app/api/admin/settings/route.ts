import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { updateShopSettings } from "@/core/modules/settings/service";
import { shopSettingsSchema } from "@/core/modules/settings/types";

export async function PUT(request: Request) {
  try {
    const session = await requireAdmin();
    const input = shopSettingsSchema.parse(await request.json().catch(() => null));
    return NextResponse.json({ settings: await updateShopSettings(input, session.user.name) });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Ongeldige instellingen (prijs tussen € 0 en € 50)" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
