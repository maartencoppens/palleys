import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { manualPaymentSchema } from "@/core/modules/orders/types";
import { paymentProvider } from "@/core/modules/payments/providers";
import {
  createManualOrderPaymentLink,
  ManualPaymentNotAllowedError,
  recordManualPayment,
} from "@/core/modules/payments/service";

const paramsSchema = z.object({ id: z.uuid() });

// Payment of an order an admin added: a Bancontact link for the customer's app, or money received some other way.
export async function POST(request: Request, ctx: RouteContext<"/api/admin/orders/[id]/payment">) {
  try {
    const session = await requireAdmin();
    const { id } = paramsSchema.parse(await ctx.params);
    const input = manualPaymentSchema.parse(await request.json().catch(() => null));

    if (input.type === "paid") {
      const result = await recordManualPayment(id, input.method, session.user.name, { sendConfirmation: input.sendConfirmation });
      return result ? NextResponse.json(result) : NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!paymentProvider.isConfigured()) {
      return NextResponse.json({ error: "Bancontact Pro is nog niet gekoppeld" }, { status: 409 });
    }
    const link = await createManualOrderPaymentLink(id);
    return link ? NextResponse.json(link) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
    if (error instanceof ManualPaymentNotAllowedError) {
      return NextResponse.json({ error: "Dit kan alleen bij een onbetaalde, handmatig toegevoegde order" }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "Betaling aanmaken is mislukt. Probeer het opnieuw." }, { status: 500 });
  }
}
