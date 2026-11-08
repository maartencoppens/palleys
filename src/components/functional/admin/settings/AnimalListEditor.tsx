"use client";

import { useState } from "react";
import type { AnimalOption } from "@/core/modules/animals/types";
import { newAnimal } from "@/core/modules/animals/utils";
import { LOCALES, type Locale } from "@/core/locale/config";
import Button from "@/components/design/Button";
import { Input } from "@/components/design/form";
import { ANIMAL_LIMITS } from "@/data/animals";
import { compactFieldClassName, fieldLabelClassName } from "./SettingsParts";

const LANGUAGE_NAMES: Record<Locale, string> = { nl: "Nederlands", en: "Engels" };
const emptyLabels = () => Object.fromEntries(LOCALES.map((locale) => [locale, ""])) as Record<Locale, string>;
const removeClassName = "shrink-0 rounded font-label text-sm font-bold text-[#a3341a] underline underline-offset-4";

type AnimalListEditorProps = {
  animals: AnimalOption[];
  disabled: string[];
  onChange: (animals: AnimalOption[], disabled: string[]) => void;
};

/*
 * The animals of the personalised Palley: names per language, on or off for the website, added or removed. The code
 * (in the product code, the print file name and the AI prompts) is made from the Dutch name once and never changes.
 */
export function AnimalListEditor({ animals, disabled, onChange }: AnimalListEditorProps) {
  const [draft, setDraft] = useState(emptyLabels);
  const [problem, setProblem] = useState<string | null>(null);

  const rename = (value: string, locale: Locale, name: string) =>
    onChange(
      animals.map((animal) => (animal.value === value ? { ...animal, labels: { ...animal.labels, [locale]: name } } : animal)),
      disabled,
    );
  const toggle = (value: string, on: boolean) =>
    onChange(animals, on ? disabled.filter((item) => item !== value) : [...disabled, value]);
  const remove = (animal: AnimalOption) => {
    if (!window.confirm(`${animal.labels.nl} verwijderen? Het verdwijnt uit de configurator, nieuwe orders en de AI-prompts.`)) return;
    onChange(
      animals.filter((item) => item.value !== animal.value),
      disabled.filter((item) => item !== animal.value),
    );
  };
  function add() {
    setProblem(null);
    if (LOCALES.some((locale) => !draft[locale].trim())) return setProblem("Vul de naam in elke taal in");
    const animal = newAnimal(
      Object.fromEntries(LOCALES.map((locale) => [locale, draft[locale].trim()])) as Record<Locale, string>,
      animals,
    );
    if (!animal) return setProblem("Gebruik letters of cijfers in de Nederlandse naam");
    onChange([...animals, animal], disabled);
    setDraft(emptyLabels());
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col divide-y divide-off-white-dark">
        {animals.map((animal) => (
          <li key={animal.value} className="flex flex-wrap items-end gap-3 py-3 first:pt-0">
            {LOCALES.map((locale) => (
              <div key={locale} className="min-w-36 flex-1">
                <label htmlFor={`animal-${animal.value}-${locale}`} className={fieldLabelClassName}>
                  {LANGUAGE_NAMES[locale]}
                </label>
                <Input
                  id={`animal-${animal.value}-${locale}`}
                  lang={locale}
                  value={animal.labels[locale]}
                  maxLength={ANIMAL_LIMITS.label}
                  onChange={(event) => rename(animal.value, locale, event.target.value)}
                  className={`mt-1 ${compactFieldClassName}`}
                />
              </div>
            ))}
            <span className="h-11 content-center font-mono text-xs text-text-muted" title="In de productcode en de printbestanden">
              {animal.code}
            </span>
            <label className="flex h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={!disabled.includes(animal.value)}
                onChange={(event) => toggle(animal.value, event.target.checked)}
                className="size-5 accent-medium-green"
              />
              Op de website
            </label>
            <button type="button" className={`h-11 ${removeClassName}`} disabled={animals.length === 1} onClick={() => remove(animal)}>
              Verwijderen
            </button>
          </li>
        ))}
      </ul>

      {animals.length < ANIMAL_LIMITS.items && (
        <div className="rounded-2xl border-[1.5px] border-dashed border-off-white-dark p-4">
          <p className="font-label text-base font-bold">Dier toevoegen</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            {LOCALES.map((locale) => (
              <div key={locale} className="min-w-36 flex-1">
                <label htmlFor={`new-animal-${locale}`} className={fieldLabelClassName}>
                  {LANGUAGE_NAMES[locale]}
                </label>
                <Input
                  id={`new-animal-${locale}`}
                  lang={locale}
                  value={draft[locale]}
                  maxLength={ANIMAL_LIMITS.label}
                  placeholder={locale === "nl" ? "Papegaai" : "Parrot"}
                  onChange={(event) => setDraft((current) => ({ ...current, [locale]: event.target.value }))}
                  className={`mt-1 ${compactFieldClassName}`}
                />
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={add}>
              Toevoegen
            </Button>
          </div>
          {problem && (
            <p role="alert" className="mt-2 text-sm text-[#a3341a]">
              {problem}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
