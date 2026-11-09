import { NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { buildSubscribersCsv } from "@/core/modules/newsletter/service";
import { formatDateCompact } from "@/core/utils/format";

// The active mailing list as CSV. Email addresses: behind admin auth, never cached.
export async function GET() {
  try {
    await requireAdmin();
    return new Response(await buildSubscribersCsv(), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="mailinglijst-${formatDateCompact(new Date())}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
