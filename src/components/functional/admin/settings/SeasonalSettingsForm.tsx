"use client";

import { useState } from "react";
import { Input } from "@/components/design/form";
import type { SeasonalSettings } from "@/core/modules/settings/types";
import { ADDONS, MAX_ADDON_PRICE_CENTS, type Addon } from "@/data/addons";
import { NO_SEASON, SEASON_IDS, SEASON_LABELS, SEASON_PREVIEW_COOKIE, type SeasonId } from "@/data/seasons";
import { compactFieldClassName, fieldLabelClassName, SaveBar, SettingsCard } from "./SettingsParts";
import { useSettingsSave } from "./useSettingsSave";

const selectClassName =
  "h-11 w-full rounded-2xl border-[1.5px] border-off-white-dark bg-white px-4 font-label text-base font-bold text-medium-green";

/** Sets or clears the preview cookie that core/modules/seasons reads. */
function writePreviewCookie(value: SeasonId | null) {
  document.cookie = value
    ? `${SEASON_PREVIEW_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
    : `${SEASON_PREVIEW_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/*
 * The seasonal edition (Christmas…): which one is on, from when to when, and the last order day before the holiday.
 * The preview is a cookie in this browser only, so a season can be checked on the real site before it goes live.
 */
export function SeasonalSettingsForm({ settings, preview: initialPreview }: { settings: SeasonalSettings; preview: SeasonId | null }) {
  const [season, setSeason] = useState<SeasonalSettings["season"]>(settings.season);
  const [startsOn, setStartsOn] = useState(settings.startsOn ?? "");
  const [endsOn, setEndsOn] = useState(settings.endsOn ?? "");
  const [orderDeadline, setOrderDeadline] = useState(settings.orderDeadline ?? "");
  // In euros as typed ("4,50"); empty = free.
  const [prices, setPrices] = useState<Record<Addon, string>>(
    () =>
      Object.fromEntries(
        ADDONS.map((addon) => {
          const cents = settings.addonPrices[addon.value];
          return [addon.value, cents ? (cents / 100).toFixed(2).replace(".", ",") : ""];
        }),
      ) as Record<Addon, string>,
  );
  const [preview, setPreview] = useState<SeasonId | null>(initialPreview);
  const { save, saving, message, error } = useSettingsSave("seasonal");

  function setPreviewCookie(value: SeasonId | null) {
    writePreviewCookie(value);
    setPreview(value);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save({
          season,
          startsOn: startsOn || null,
          endsOn: endsOn || null,
          orderDeadline: orderDeadline || null,
          addonPrices: Object.fromEntries(
            ADDONS.flatMap((addon) => {
              const euros = Number(prices[addon.value].replace(",", ".").trim() || "0");
              return Number.isFinite(euros) && euros > 0 ? [[addon.value, Math.round(euros * 100)]] : [];
            }),
          ),
        });
      }}
      className="flex flex-col gap-6"
    >
      <SettingsCard
        title="Seizoensversie"
        intro="Een seizoensversie voegt alleen iets toe aan de gewone website (versiering, extra teksten, een extra blok). Zet ze terug op 'Geen' en alles is weer zoals altijd."
      >
        <label htmlFor="season" className={fieldLabelClassName}>
          Seizoen
        </label>
        <select
          id="season"
          value={season}
          onChange={(event) => setSeason(event.target.value as SeasonalSettings["season"])}
          className={`mt-2 ${selectClassName}`}
        >
          <option value={NO_SEASON}>Geen (gewone website)</option>
          {SEASON_IDS.map((id) => (
            <option key={id} value={id}>
              {SEASON_LABELS[id]}
            </option>
          ))}
        </select>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="season-starts" className={fieldLabelClassName}>
              Vanaf (optioneel)
            </label>
            <Input id="season-starts" type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} className={`mt-2 ${compactFieldClassName}`} />
          </div>
          <div>
            <label htmlFor="season-ends" className={fieldLabelClassName}>
              Tot en met (optioneel)
            </label>
            <Input id="season-ends" type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} className={`mt-2 ${compactFieldClassName}`} />
          </div>
        </div>
        <p className="mt-2 text-sm text-text-muted">
          Zonder datums staat de seizoensversie aan zolang ze gekozen is. Met datums gaat ze vanzelf aan en uit (Belgische tijd).
        </p>

        <label htmlFor="season-deadline" className={`mt-5 block ${fieldLabelClassName}`}>
          Laatste besteldag voor levering op tijd (optioneel)
        </label>
        <Input
          id="season-deadline"
          type="date"
          value={orderDeadline}
          onChange={(event) => setOrderDeadline(event.target.value)}
          className={`mt-2 sm:max-w-xs ${compactFieldClassName}`}
        />
        <p className="mt-2 text-sm text-text-muted">
          Komt in de banner, de hero, het kerstblok en de FAQ. Leeg of voorbij: die zinnen vallen weg, de rest blijft.
        </p>
      </SettingsCard>

      <SettingsCard
        title="Extra's op een Palley"
        intro="Wat klanten tijdens het seizoen extra kunnen kiezen in de configurator. De prompt per extra staat bij Instellingen → Prompts. Leeg = gratis."
      >
        <ul className="grid gap-4 sm:grid-cols-2">
          {ADDONS.map((addon) => (
            <li key={addon.value}>
              <label htmlFor={`addon-price-${addon.value}`} className={fieldLabelClassName}>
                {addon.label} ({SEASON_LABELS[addon.season]}), meerprijs in €
              </label>
              <Input
                id={`addon-price-${addon.value}`}
                inputMode="decimal"
                placeholder="0,00"
                value={prices[addon.value]}
                onChange={(event) => setPrices((current) => ({ ...current, [addon.value]: event.target.value }))}
                className={`mt-2 ${compactFieldClassName}`}
                aria-describedby="addon-price-hint"
              />
            </li>
          ))}
        </ul>
        <p id="addon-price-hint" className="mt-2 text-sm text-text-muted">
          Maximaal € {MAX_ADDON_PRICE_CENTS / 100} per extra. Komt bovenop de prijs van de Palley, in het mandje en bij het afrekenen.
        </p>
      </SettingsCard>

      <SettingsCard
        title="Voorbeeld bekijken"
        intro="Alleen in deze browser: zo zie je een seizoensversie op de echte website voor ze live gaat. Bezoekers merken er niets van."
      >
        <div className="flex flex-wrap items-center gap-3">
          {SEASON_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setPreviewCookie(id)}
              className="rounded-full bg-medium-green px-5 py-2.5 font-label text-base font-semibold text-off-white"
            >
              Bekijk {SEASON_LABELS[id].toLowerCase()} in deze browser
            </button>
          ))}
          {preview && (
            <button
              type="button"
              onClick={() => setPreviewCookie(null)}
              className="rounded-full border-[1.5px] border-medium-green px-5 py-2.5 font-label text-base font-semibold text-medium-green"
            >
              Voorbeeld uitzetten
            </button>
          )}
          <a href="/" target="_blank" rel="noreferrer" className="font-label text-base font-semibold text-medium-green underline">
            Website openen
          </a>
        </div>
        {preview && (
          <p role="status" className="mt-3 text-sm text-medium-green">
            Voorbeeld staat aan in deze browser: {SEASON_LABELS[preview]}.
          </p>
        )}
      </SettingsCard>

      <SaveBar saving={saving} message={message} error={error} />
    </form>
  );
}
