"use client";

import { useState } from "react";
import type { ShippingSettings } from "@/core/modules/settings/types";
import { fromEuroInput, toEuroInput } from "@/core/utils/format";
import { Input } from "@/components/design/form";
import { MAX_SHIPPING_PRICE_CENTS, STATIC_DELIVERY_OPTIONS } from "@/data/shipping";
import { SaveBar, SettingsCard } from "./SettingsParts";
import { useSettingsSave } from "./useSettingsSave";

type Row = { enabled: boolean; price: string };

export function ShippingSettingsForm({ settings }: { settings: ShippingSettings }) {
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(
      STATIC_DELIVERY_OPTIONS.map((option) => {
        const override = settings.shippingOverrides[option.id];
        return [
          option.id,
          { enabled: override?.enabled ?? true, price: toEuroInput(override?.priceCents ?? option.defaultPriceCents) },
        ];
      }),
    ),
  );
  const { save, saving, message, error, setError, setMessage } = useSettingsSave("shipping");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    const shippingOverrides: Record<string, { enabled: boolean; priceCents: number }> = {};
    for (const option of STATIC_DELIVERY_OPTIONS) {
      const row = rows[option.id];
      const priceCents = fromEuroInput(row.price);
      if (priceCents === null || priceCents > MAX_SHIPPING_PRICE_CENTS) {
        setError(`Ongeldige prijs voor "${option.label}" (bv. 4,95, maximum € ${MAX_SHIPPING_PRICE_CENTS / 100})`);
        return;
      }
      shippingOverrides[option.id] = { enabled: row.enabled, priceCents };
    }
    void save({ shippingOverrides });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <SettingsCard
        title="Verzendopties"
        intro="Prijs die de klant betaalt: in de checkout en op het verzendbeleid (/verzendbeleid). Uitgevinkt = niet te kiezen."
      >
        <ul className="divide-y divide-off-white-dark">
          {STATIC_DELIVERY_OPTIONS.map((option) => (
            <li key={option.id} className="flex flex-wrap items-center gap-4 py-4">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={rows[option.id].enabled}
                  onChange={(event) =>
                    setRows((current) => ({ ...current, [option.id]: { ...current[option.id], enabled: event.target.checked } }))
                  }
                  className="size-5 accent-medium-green"
                />
                <span className="flex flex-col">
                  <span className="font-label text-base font-bold">{option.label}</span>
                  <span className="text-sm text-text-muted">
                    {option.country} · {option.carrier}
                  </span>
                </span>
              </label>
              <div className="flex items-center gap-2">
                <span className="font-label font-semibold text-text-muted">€</span>
                <Input
                  aria-label={`Prijs ${option.label}`}
                  inputMode="decimal"
                  value={rows[option.id].price}
                  onChange={(event) =>
                    setRows((current) => ({ ...current, [option.id]: { ...current[option.id], price: event.target.value } }))
                  }
                  className="h-11 w-28 text-base!"
                />
              </div>
            </li>
          ))}
        </ul>
      </SettingsCard>
      <SaveBar saving={saving} message={message} error={error} />
    </form>
  );
}
