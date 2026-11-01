import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { updateSettingsSection } from "@/core/modules/settings/service";
import { isSettingsSection, SETTINGS_SECTION_SCHEMAS } from "@/core/modules/settings/types";

export async function PUT(request: Request, ctx: RouteContext<"/api/admin/settings/[section]">) {
  try {
    const session = await requireAdmin();
    const { section } = await ctx.params;
    if (!isSettingsSection(section)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const input = SETTINGS_SECTION_SCHEMAS[section].parse(await request.json().catch(() => null));
    return NextResponse.json({ settings: await updateSettingsSection(section, input as never, session.user.name) });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      return NextResponse.json({ error: `Ongeldige invoer (${issue.path.join(".") || "formulier"}): ${issue.message}` }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
