import { requireAdminPage } from "@/core/modules/auth/service";
import { paymentProvider } from "@/core/modules/payments/providers";
import { BANCONTACT_CALLBACK_PATH } from "@/core/modules/payments/providers/bancontact";
import { isEmailConfigured } from "@/core/networking/external/email-client";
import { env } from "@/core/utils/env";
import { TERMS_VERSION } from "@/data/checkout";
import { Badge } from "@/components/design/Badge";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";

export const instant = false;

export default async function AdminIntegrationsPage() {
  await requireAdminPage();
  const mode = paymentProvider.mode();
  const fake = paymentProvider.name === "fake";
  const callbackReachable = env.APP_URL.startsWith("https://") && !["localhost", "127.0.0.1"].includes(new URL(env.APP_URL).hostname);

  const status = [
    {
      label: "Bancontact Pro (KBC)",
      value: fake ? "Testbetalingen, geen echt geld" : mode === "live" ? "Productie" : mode === "test" ? "Preprod (test)" : "Niet gekoppeld",
      tone: mode === "live" && !fake ? "success" : mode === "test" ? "waiting" : "danger",
      hint: fake
        ? "PAYMENT_PROVIDER=fake: alleen lokaal, staat in productie altijd uit"
        : mode
        ? `BANCONTACT_ENV=${env.BANCONTACT_ENV}`
        : "Zet BANCONTACT_API_KEY en BANCONTACT_PAYMENT_PROFILE_ID in .env (portal.bancontactpro.com) en herstart",
    },
    {
      label: "Payment profile",
      value: env.BANCONTACT_PAYMENT_PROFILE_ID ? "Ingesteld" : "Niet ingesteld",
      tone: env.BANCONTACT_PAYMENT_PROFILE_ID ? "success" : "danger",
      hint: "Elke callback moet voor dit profiel ondertekend zijn",
    },
    {
      label: "Callback",
      value: callbackReachable ? `${env.APP_URL}${BANCONTACT_CALLBACK_PATH}` : "Lokaal: geen callback",
      tone: callbackReachable ? "success" : "waiting",
      hint: callbackReachable
        ? "Bancontact meldt hier elke statuswijziging (ondertekend, wordt gecontroleerd)"
        : "Bancontact kan localhost niet bereiken; de return-pagina vraagt de status zelf op",
    },
    {
      label: "Return-URL",
      value: env.APP_URL.startsWith("https://") ? "https: in orde" : "Geen https",
      tone: env.APP_URL.startsWith("https://") ? "success" : "danger",
      hint: "Bancontact aanvaardt enkel https. Lokaal: npm run dev:https met APP_URL=https://localhost:3000",
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
