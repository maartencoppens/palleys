import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { paymentProvider } from "@/core/modules/payments/providers";
import { STRIPE_WEBHOOK_PATH } from "@/core/modules/payments/providers/stripe";
import { STRIPE_WEBHOOK_EVENTS } from "@/core/modules/payments/providers/stripe-session";
import { isEmailConfigured } from "@/core/networking/external/email-client";
import { stripeKeyMode } from "@/core/networking/external/stripe-client";
import { env } from "@/core/utils/env";
import { TERMS_VERSION } from "@/data/checkout";
import { Badge } from "@/components/design/Badge";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";

export const instant = false;

// Only whether something is set and in which mode: never a key, secret or configuration id itself.
export default async function AdminIntegrationsPage() {
  await requireAdminPage();
  const mode = paymentProvider.mode();
  const fake = paymentProvider.name === "fake";
  const keyMode = stripeKeyMode();
  const restricted = env.STRIPE_SECRET?.startsWith("rk_") ?? false;

  const status = [
    {
      label: "Betalingen (Stripe)",
      value: fake ? "Testbetalingen, geen echt geld" : mode === "live" ? "Live" : mode === "test" ? "Testmodus" : "Niet gekoppeld",
      tone: mode === "live" && !fake ? "success" : mode === "test" ? "waiting" : "danger",
      hint: fake
        ? "PAYMENT_PROVIDER=fake: alleen lokaal, staat in productie altijd uit"
        : mode
          ? "Sleutel, webhook-secret en betaalmethode-configuratie zijn ingesteld"
          : "Zet STRIPE_SECRET, STRIPE_WEBHOOK_SECRET en STRIPE_PAYMENT_METHOD_CONFIG in .env en herstart",
    },
    {
      label: "STRIPE_SECRET",
      value: keyMode ? `Ingesteld (${keyMode === "live" ? "live" : "test"}${restricted ? ", restricted key" : ""})` : "Niet ingesteld",
      tone: keyMode === "live" ? "success" : keyMode === "test" ? "waiting" : "danger",
      hint: "sk_test_… / sk_live_… (of rk_…), uit Developers → API keys",
    },
    {
      label: "STRIPE_WEBHOOK_SECRET",
      value: env.STRIPE_WEBHOOK_SECRET ? "Ingesteld" : "Niet ingesteld",
      tone: env.STRIPE_WEBHOOK_SECRET ? "success" : "danger",
      hint: "whsec_…: lokaal van `stripe listen`, in productie van het webhook-endpoint in het dashboard",
    },
    {
      label: "STRIPE_PAYMENT_METHOD_CONFIG",
      value: env.STRIPE_PAYMENT_METHOD_CONFIG ? "Ingesteld" : "Niet ingesteld",
      tone: env.STRIPE_PAYMENT_METHOD_CONFIG ? "success" : "danger",
      hint: "pmc_…: test- en live-modus hebben elk hun eigen configuratie",
    },
    {
      label: "Webhook-endpoint",
      value: `${env.APP_URL}${STRIPE_WEBHOOK_PATH}`,
      tone: "neutral",
      hint: `In het Stripe-dashboard (Developers → Webhooks) met de events: ${STRIPE_WEBHOOK_EVENTS.join(", ")}. Lokaal: stripe listen --forward-to localhost:3000${STRIPE_WEBHOOK_PATH}`,
    },
    {
      label: "Bevestigingsmails",
      value: isEmailConfigured() ? "Resend ingesteld" : "Niet ingesteld",
      tone: isEmailConfigured() ? "success" : "danger",
      hint: "RESEND_API_KEY en EMAIL_FROM",
    },
    {
      label: "Cron (onbetaalde orders sluiten)",
      value: env.CRON_SECRET ? "Secret ingesteld" : "Niet ingesteld",
      tone: env.CRON_SECRET ? "success" : "waiting",
      hint: "POST /api/cron/expire-orders met Authorization: Bearer $CRON_SECRET, elke 10 min",
    },
    { label: "Versie voorwaarden", value: TERMS_VERSION, tone: "neutral", hint: "src/data/checkout.ts" },
  ] as const;

  return (
    <>
      <SettingsHeader title="Koppelingen" intro="Alleen-lezen: geheimen staan in de .env van de server." />
      <p className="text-sm">
        Welke betaalmethodes klanten zien, stel je in onder{" "}
        <Link href="/admin/settings/payment-methods" className="font-semibold underline">
          Betaalmethodes
        </Link>
        .
      </p>
      <section className="rounded-3xl bg-white p-6 md:p-8">
        <dl className="grid gap-6 text-sm md:grid-cols-2">
          {status.map((row) => (
            <div key={row.label}>
              <dt className="font-label font-semibold text-text-muted">{row.label}</dt>
              <dd className="mt-1 break-all">
                <Badge tone={row.tone}>{row.value}</Badge>
              </dd>
              <dd className="mt-1 text-xs text-text-muted">{row.hint}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
