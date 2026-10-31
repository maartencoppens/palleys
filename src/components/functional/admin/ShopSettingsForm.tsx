"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { putShopSettings } from "@/core/modules/settings/api";
import type { ShopSettings } from "@/core/modules/settings/types";
import { getApiErrorMessage } from "@/core/networking/api";
import Button from "@/components/design/Button";
import { Input, Textarea } from "@/components/design/form";
import { MAX_SHIPPING_PRICE_CENTS, STATIC_DELIVERY_OPTIONS } from "@/data/shipping";

type Row = { enabled: boolean; price: string };

const toEuroInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const fromEuroInput = (value: string) => {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
};

/* Checkout switch and delivery prices. Product prices stay in code on purpose (src/data/pricing.ts). */
export function ShopSettingsForm({ settings }: { settings: ShopSettings }) {
  const router = useRouter();
  const [checkoutEnabled, setCheckoutEnabled] = useState(settings.checkoutEnabled);
  const [closedMessage, setClosedMessage] = useState(settings.checkoutClosedMessage ?? "");
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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
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
    setSaving(true);
    try {
      await putShopSettings({
        checkoutEnabled,
        checkoutClosedMessage: closedMessage.trim() || null,
        shippingOverrides,
      });
      setMessage("Opgeslagen");
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <section className="rounded-3xl bg-white p-6 md:p-8">
        <h2 className="font-display text-2xl font-medium text-medium-green">Bestellen</h2>
        <label className="mt-4 flex cursor-pointer items-center gap-3 text-base font-semibold">
          <input
            type="checkbox"
            checked={checkoutEnabled}
            onChange={(event) => setCheckoutEnabled(event.target.checked)}
            className="size-5 accent-medium-green"
          />
          Klanten kunnen bestellen en betalen
        </label>
        <p className="mt-1 text-sm text-text-muted">
          Uitzetten pauzeert de checkout meteen (bv. tijdens vakantie of bij een probleem). Winkelmandjes blijven bewaard.
        </p>
        <label htmlFor="closed-message" className="mt-5 block font-label text-sm font-semibold text-text-muted">
          Boodschap wanneer bestellen gepauzeerd is (optioneel)
        </label>
        <Textarea
          id="closed-message"
          rows={2}
          maxLength={300}
          value={closedMessage}
          onChange={(event) => setClosedMessage(event.target.value)}
          placeholder="We zijn met vakantie tot 15 augustus. Bestellen kan daarna weer!"
          className="mt-2 min-h-20 text-base md:text-base"
        />
      </section>

      <section className="rounded-3xl bg-white p-6 md:p-8">
        <h2 className="font-display text-2xl font-medium text-medium-green">Verzendopties</h2>
        <p className="mt-1 text-sm text-text-muted">
          Prijs die de klant betaalt, incl. btw. Vaste opties tot Sendcloud gekoppeld is; daarna blijven ze de noodoplossing.
        </p>
        <ul className="mt-4 divide-y divide-off-white-dark">
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
                  className="h-11 w-28 text-base md:text-base"
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="primary" loading={saving} loadingText="Opslaan…">
          Instellingen opslaan
        </Button>
        {message && (
          <p role="status" className="text-sm text-medium-green">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-[#a3341a]">
            {error}
          </p>
        )}
      </div>
      {settings.updatedBy && settings.updatedAt && (
        <p className="text-sm text-text-muted">
          Laatst aangepast door {settings.updatedBy} op {new Date(settings.updatedAt).toLocaleString("nl-BE")}
        </p>
      )}
    </form>
  );
}
