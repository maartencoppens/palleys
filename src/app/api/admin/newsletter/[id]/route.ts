import { after, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { SubscriberNotFoundError, syncSubscriberToResend, unsubscribe } from "@/core/modules/newsletter/service";
import { maskEmail } from "@/core/modules/orders/utils";

const paramsSchema = z.object({ id: z.uuid() });

// Someone asked to be taken off the mailing list: here, and right after in Resend (the sync button retries a failure).
export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/newsletter/[id]">) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const subscriber = await unsubscribe(id);
    after(() =>
      syncSubscriberToResend(subscriber.email).catch((error) =>
        console.error(`[newsletter] Resend sync failed for ${maskEmail(subscriber.email)}:`, error instanceof Error ? error.message : error),
      ),
    );
    return NextResponse.json({ id: subscriber.id });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    if (error instanceof SubscriberNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
