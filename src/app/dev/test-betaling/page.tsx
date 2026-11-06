import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { fakePaymentsEnabled, fakeProvider } from "@/core/modules/payments/providers/fake";
import { formatPrice } from "@/core/utils/format";
import FakePaymentButtons from "@/components/functional/shop/checkout/FakePaymentButtons";

export const instant = false;

export const metadata: Metadata = { title: "Testbetaling | Palleys", robots: { index: false, follow: false } };

const searchSchema = z.object({
  payment: z.string().refine(fakeProvider.isPaymentId),
  amount: z.coerce.number().int().min(0),
  reference: z.string().max(40),
  return: z.url({ protocol: /^https?$/ }),
});

/* Stands in for Bancontact's hosted page when PAYMENT_PROVIDER=fake. Not there at all otherwise. */
export default async function FakePaymentPage({ searchParams }: PageProps<"/dev/test-betaling">) {
  if (!fakePaymentsEnabled) notFound();
  const parsed = searchSchema.safeParse(await searchParams);
  if (!parsed.success) notFound();
  const { payment, amount, reference, return: returnUrl } = parsed.data;

  return (
    <main className="flex min-h-screen items-center justify-center bg-medium-green px-5 py-10 font-body text-text-primary">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-3xl bg-off-white p-6 md:p-10">
        <p className="rounded-2xl bg-light-yellow px-4 py-3 font-label text-sm font-bold text-medium-green">
          Testbetaling: dit is niet Bancontact en er gaat geen echt geld om.
        </p>
        <div>
          <p className="font-label text-sm font-semibold text-text-muted">Te betalen voor {reference}</p>
          <p className="font-display text-5xl font-bold text-medium-green">{formatPrice(amount / 100)}</p>
        </div>
        <FakePaymentButtons paymentId={payment} returnUrl={returnUrl} />
      </div>
    </main>
  );
}
