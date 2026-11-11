"use client";

import { useState } from "react";
import { putPaymentMethod } from "@/core/modules/payments/api";
import type { PaymentMethodOverview, PaymentMethodState } from "@/core/modules/payments/method-rules";
import { getApiErrorMessage } from "@/core/networking/api";
import { Badge } from "@/components/design/Badge";
import { SettingsCard } from "./SettingsParts";

function statusOf(state: PaymentMethodState) {
  if (state.available) return { tone: "success", text: "Aan: klanten zien deze methode" } as const;
  if (state.value === "on") {
    return { tone: "waiting", text: "Aan, maar niet beschikbaar: activeer ze eerst voor je account in het Stripe-dashboard" } as const;
  }
  return { tone: "neutral", text: "Uit" } as const;
}

/* One switch per method. Each change goes to Stripe straight away; the server checks the rules again. */
export function PaymentMethodsForm({ initial }: { initial: PaymentMethodOverview }) {
  const [overview, setOverview] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingCard, setConfirmingCard] = useState<string | null>(null);

  const toggleable = overview.methods.filter((state) => state.toggleable);
  const readOnly = overview.methods.filter((state) => !state.toggleable && state.value === "on");
  const onCount = overview.methods.filter((state) => state.value === "on").length;

  async function change(state: PaymentMethodState, enabled: boolean, confirmCardFees = false) {
    setBusy(state.method);
    setError(null);
    setMessage(null);
    try {
      setOverview(await putPaymentMethod({ method: state.method, enabled, ...(confirmCardFees && { confirmCardFees }) }));
      setMessage(`${state.label} staat ${enabled ? "aan" : "uit"}.`);
      setConfirmingCard(null);
    } catch (caught) {
      setError(getApiErrorMessage(caught, "Opslaan bij Stripe mislukt"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <p role="note" className={`rounded-2xl p-4 text-sm ${overview.mode === "live" ? "bg-light-green" : "bg-light-yellow"}`}>
        <strong>{overview.mode === "live" ? "Live-modus: echte betalingen." : "Testmodus: geen echt geld."}</strong> Test- en live-modus
        hebben elk een eigen configuratie in Stripe, met een eigen ID. Wat je hier aanpast, geldt alleen voor de{" "}
        {overview.mode === "live" ? "live" : "test"}configuratie{overview.configName ? ` (“${overview.configName}”)` : ""}.
      </p>

      <SettingsCard title="Betaalmethodes in de checkout" intro="Minstens één methode moet aan blijven.">
        <ul className="flex flex-col divide-y divide-off-white-dark">
          {toggleable.map((state) => {
            const status = statusOf(state);
            const on = state.value === "on";
            const lastOn = on && onCount <= 1;
            return (
              <li key={state.method} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-label text-base font-bold">{state.label}</p>
                    <div className="mt-1">
                      <Badge tone={status.tone}>{status.text}</Badge>
                    </div>
                  </div>
                  <label className={`flex items-center gap-2 text-sm font-semibold ${busy || lastOn ? "opacity-60" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={on}
                      disabled={busy !== null || lastOn}
                      onChange={(event) => {
                        if (event.target.checked && state.card) setConfirmingCard(state.method);
                        else void change(state, event.target.checked);
                      }}
                      className="size-5 accent-medium-green"
                    />
                    {busy === state.method ? "Bezig…" : on ? "Aan" : "Uit"}
                  </label>
                </div>
                {lastOn && <p className="text-xs text-text-muted">Dit is de laatste methode die aan staat: ze kan niet uit.</p>}
                {state.card && !on && <p className="text-xs text-text-muted">Kaartbetaling: duurder per betaling, standaard uit.</p>}
                {confirmingCard === state.method && (
                  <div role="alertdialog" aria-label={`${state.label} aanzetten`} className="rounded-2xl bg-light-yellow p-4 text-sm">
                    <p>
                      <strong>Kaartbetalingen zijn duurder.</strong> Stripe rekent per kaartbetaling (en voor Apple Pay, Google Pay en
                      Link, die over een kaart lopen) meer aan dan voor Bancontact of iDEAL | Wero. Toch aanzetten?
                    </p>
                    <div className="mt-3 flex gap-3">
                      <button
                        type="button"
                        onClick={() => void change(state, true, true)}
                        disabled={busy !== null}
                        className="rounded-pill bg-medium-green px-4 py-2 font-label font-bold text-off-white"
                      >
                        Ja, {state.label} aanzetten
                      </button>
                      <button type="button" onClick={() => setConfirmingCard(null)} className="rounded-pill px-4 py-2 font-label font-bold underline">
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {message && (
          <p role="status" className="mt-4 text-sm text-medium-green">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-2xl bg-pink p-4 text-sm">
            {error}
          </p>
        )}
      </SettingsCard>

      {readOnly.length > 0 && (
        <SettingsCard
          title="Andere methodes die aan staan in Stripe"
          intro="Onze checkout ondersteunt deze (nog) niet, dus je kan ze hier niet aanpassen. Zet ze uit in het Stripe-dashboard als klanten ze niet mogen zien."
        >
          <ul className="flex flex-wrap gap-2">
            {readOnly.map((state) => (
              <li key={state.method}>
                <Badge tone={state.available ? "waiting" : "neutral"}>
                  {state.label}
                  {state.available ? "" : " (niet beschikbaar)"}
                </Badge>
              </li>
            ))}
          </ul>
        </SettingsCard>
      )}
    </>
  );
}
