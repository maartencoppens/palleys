import { connection, NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { syncAllSubscribersToResend } from "@/core/modules/newsletter/service";
import { isContactSyncConfigured } from "@/core/networking/external/resend-contacts";

// The sync button: the whole mailing list once to Resend. Sequential under Resend's rate limit, so it may take a while.
export const maxDuration = 300;

export async function POST() {
  await connection();
  try {
    await requireAdmin();
    if (!isContactSyncConfigured()) return NextResponse.json({ error: "RESEND_API_KEY ontbreekt" }, { status: 503 });
    return NextResponse.json(await syncAllSubscribersToResend());
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
