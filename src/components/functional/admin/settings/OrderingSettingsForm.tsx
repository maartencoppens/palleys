"use client";

import Link from "next/link";
import { useState } from "react";
import type { OrderingSettings } from "@/core/modules/settings/types";
import { Textarea } from "@/components/design/form";
import { fieldLabelClassName, SaveBar, SettingsCard } from "./SettingsParts";
import { useSettingsSave } from "./useSettingsSave";

/* The checkout's on/off switch. Orders toevoegen in de backoffice blijft altijd werken. */
export function OrderingSettingsForm({ settings, paymentsAvailable }: { settings: OrderingSettings; paymentsAvailable: boolean }) {
  const [checkoutEnabled, setCheckoutEnabled] = useState(settings.checkoutEnabled);
  const [closedMessage, setClosedMessage] = useState(settings.checkoutClosedMessage ?? "");
  const { save, saving, message, error } = useSettingsSave("ordering");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save({ checkoutEnabled, checkoutClosedMessage: closedMessage.trim() || null });
      }}
      className="flex flex-col gap-6"
    >
      <SettingsCard title="Bestellen op de website">
        <label className="flex cursor-pointer items-center gap-3 text-base font-semibold">
          <input
            type="checkbox"
            checked={checkoutEnabled}
            onChange={(event) => setCheckoutEnabled(event.target.checked)}
            className="size-5 accent-medium-green"
          />
          Klanten kunnen bestellen en betalen
        </label>
        <p className="mt-1 text-sm text-text-muted">
          Uitzetten pauzeert de checkout meteen (bv. tijdens vakantie of bij een probleem). Winkelmandjes blijven bewaard, en
          orders toevoegen in de backoffice blijft werken.
        </p>
        {checkoutEnabled && !paymentsAvailable && (
          <p role="status" className="mt-4 rounded-2xl bg-light-yellow p-4 text-sm text-text-primary">
            <strong>Klanten kunnen nog niet afrekenen:</strong> Bancontact Pro is nog niet gekoppeld, dus de checkout toont
            &ldquo;Betalen is tijdelijk niet mogelijk&rdquo;. Bekijk de <Link href="/admin/settings/integrations" className="font-semibold underline">koppelingen</Link>.
          </p>
        )}
        <label htmlFor="closed-message" className={`mt-5 block ${fieldLabelClassName}`}>
          Boodschap wanneer bestellen gepauzeerd is (optioneel)
        </label>
        <Textarea
          id="closed-message"
          rows={2}
          maxLength={300}
          value={closedMessage}
          onChange={(event) => setClosedMessage(event.target.value)}
          placeholder="We zijn met vakantie tot 15 augustus. Bestellen kan daarna weer!"
          className="mt-2 min-h-20 text-base!"
        />
      </SettingsCard>
      <SaveBar saving={saving} message={message} error={error} />
    </form>
  );
}
