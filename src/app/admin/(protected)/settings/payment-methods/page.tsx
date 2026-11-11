import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import {
  getPaymentMethodOverview,
  PaymentMethodConfigError,
  recentPaymentMethodChanges,
} from "@/core/modules/payments/method-config";
import type { PaymentMethodOverview } from "@/core/modules/payments/method-rules";
import { fakePaymentsEnabled } from "@/core/modules/payments/providers/fake";
import { isStripeConfigured } from "@/core/networking/external/stripe-client";
import { PaymentMethodsForm } from "@/components/functional/admin/settings/PaymentMethodsForm";
import { SettingsCard, SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";

export const instant = false;

export default async function AdminPaymentMethodsPage() {
  await requireAdminPage();

  let overview: PaymentMethodOverview | null = null;
  let error: string | null = null;
  if (!isStripeConfigured()) {
    error = "Stripe is niet gekoppeld: zet STRIPE_SECRET, STRIPE_WEBHOOK_SECRET en STRIPE_PAYMENT_METHOD_CONFIG in .env en herstart.";
  } else {
    try {
      overview = await getPaymentMethodOverview();
    } catch (caught) {
      error = caught instanceof PaymentMethodConfigError ? caught.message : "De betaalmethodes konden niet opgehaald worden.";
    }
  }
  const changes = await recentPaymentMethodChanges();

  return (
    <>
      <SettingsHeader
        title="Betaalmethodes"
        intro="Welke methodes klanten op de betaalpagina van Stripe zien. Dit wordt rechtstreeks in Stripe aangepast; Stripe is de enige bron."
      />
      {fakePaymentsEnabled && (
        <p role="status" className="rounded-2xl bg-light-yellow p-4 text-sm">
          PAYMENT_PROVIDER=fake: de checkout gebruikt nu testbetalingen, deze instellingen hebben daar geen invloed op.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-2xl bg-pink p-4 text-sm">
          {error} Zie ook de <Link href="/admin/settings/integrations" className="font-semibold underline">koppelingen</Link>.
        </p>
      )}
      {overview && <PaymentMethodsForm initial={overview} />}
      {changes.length > 0 && (
        <SettingsCard title="Laatste wijzigingen">
          <ul className="flex flex-col gap-1 text-sm">
            {changes.map((change) => (
              <li key={change.id}>
                {change.createdAt.toLocaleString("nl-BE")}: {change.actor} zette {change.subject} van {change.fromValue ?? "?"} op{" "}
                {change.toValue ?? "?"}
              </li>
            ))}
          </ul>
        </SettingsCard>
      )}
    </>
  );
}
