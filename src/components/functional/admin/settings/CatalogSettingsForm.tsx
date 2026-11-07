"use client";

import { useState } from "react";
import type { CatalogSettings } from "@/core/modules/settings/types";
import { fromEuroInput, toEuroInput } from "@/core/utils/format";
import { Input } from "@/components/design/form";
import { editions, type Edition } from "@/data/options";
import { AnimalListEditor } from "./AnimalListEditor";
import { MAX_PRODUCT_PRICE_CENTS } from "@/data/pricing";
import { compactFieldClassName, fieldLabelClassName, SaveBar, SettingsCard } from "./SettingsParts";
import { useSettingsSave } from "./useSettingsSave";

function toggled<T>(list: T[], value: T, off: boolean) {
  return off ? [...list, value] : list.filter((item) => item !== value);
}

/* The personalised Palley: what it costs and what customers can choose in the configurator. */
export function CatalogSettingsForm({ settings }: { settings: CatalogSettings }) {
  const [keychain, setKeychain] = useState(toEuroInput(settings.prices.keychain));
  const [figurine, setFigurine] = useState(toEuroInput(settings.prices.figurine));
  const [animals, setAnimals] = useState(settings.animals);
  const [disabledAnimals, setDisabledAnimals] = useState<string[]>(settings.disabledAnimals);
  const [disabledEditions, setDisabledEditions] = useState<Edition[]>(settings.disabledEditions);
  const { save, saving, message, error, setError, setMessage } = useSettingsSave("catalog");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    const prices = { keychain: fromEuroInput(keychain), figurine: fromEuroInput(figurine) };
    if (!prices.keychain || !prices.figurine || prices.keychain > MAX_PRODUCT_PRICE_CENTS || prices.figurine > MAX_PRODUCT_PRICE_CENTS) {
      setError(`Vul geldige prijzen in (bv. 27,99, maximum € ${MAX_PRODUCT_PRICE_CENTS / 100})`);
      return;
    }
    if (disabledAnimals.length === animals.length) return setError("Laat minstens één dier aan staan");
    if (animals.some((animal) => Object.values(animal.labels).some((label) => !label.trim()))) {
      return setError("Elk dier heeft een naam nodig in elke taal");
    }
    if (disabledEditions.length === editions.length) return setError("Laat minstens één uitvoering aan staan");
    void save({ prices: { keychain: prices.keychain, figurine: prices.figurine }, animals, disabledAnimals, disabledEditions });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <SettingsCard
        title="Prijzen"
        intro="Geldt meteen voor nieuwe bestellingen; bestaande orders houden hun prijs."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="price-keychain" className={fieldLabelClassName}>
              Met sleutelhanger
            </label>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-label font-semibold text-text-muted">€</span>
              <Input
                id="price-keychain"
                inputMode="decimal"
                value={keychain}
                onChange={(event) => setKeychain(event.target.value)}
                className={compactFieldClassName}
              />
            </div>
          </div>
          <div>
            <label htmlFor="price-figurine" className={fieldLabelClassName}>
              Enkel figuurtje
            </label>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-label font-semibold text-text-muted">€</span>
              <Input
                id="price-figurine"
                inputMode="decimal"
                value={figurine}
                onChange={(event) => setFigurine(event.target.value)}
                className={compactFieldClassName}
              />
            </div>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Uitvoeringen" intro="Wat klanten kunnen kiezen in de configurator.">
        <ul className="flex flex-col gap-3">
          {editions.map((edition) => (
            <li key={edition.value}>
              <label className="flex cursor-pointer items-center gap-3 text-base font-semibold">
                <input
                  type="checkbox"
                  checked={!disabledEditions.includes(edition.value)}
                  onChange={(event) => setDisabledEditions((list) => toggled(list, edition.value, !event.target.checked))}
                  className="size-5 accent-medium-green"
                />
                {edition.label}
              </label>
            </li>
          ))}
        </ul>
      </SettingsCard>

      <SettingsCard
        title="Dieren"
        intro="Wat klanten kunnen kiezen in de configurator. Een nieuw dier staat na het opslaan overal: in de configurator, bij nieuwe orders en bij de AI-prompts (met de algemene prompt tot je het een eigen geeft). Zet een dier uit als je het tijdelijk niet kunt maken; verwijderen haalt het overal weg, bestaande orders houden het."
      >
        <AnimalListEditor
          animals={animals}
          disabled={disabledAnimals}
          onChange={(nextAnimals, nextDisabled) => {
            setAnimals(nextAnimals);
            setDisabledAnimals(nextDisabled);
          }}
        />
      </SettingsCard>

      <SaveBar saving={saving} message={message} error={error} />
    </form>
  );
}
