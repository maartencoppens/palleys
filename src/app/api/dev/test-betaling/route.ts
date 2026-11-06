import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { fakePaymentsEnabled, fakeProvider } from "@/core/modules/payments/providers/fake";

const bodySchema = z.object({
  paymentId: z.string().refine(fakeProvider.isPaymentId),
  outcome: z.enum(["PAID", "FAILED", "CANCELED", "EXPIRED"]),
});

// What the bank would do: decide how a payment ended. Our app then finds out the normal way, by asking the provider.
export async function POST(request: Request) {
  if (!fakePaymentsEnabled) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { count } = await prisma.payment.updateMany({
    where: { providerPaymentId: body.data.paymentId, provider: fakeProvider.name },
    data: { status: body.data.outcome },
  });
  return count === 1 ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
