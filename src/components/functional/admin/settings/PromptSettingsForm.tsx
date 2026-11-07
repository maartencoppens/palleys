"use client";

import Link from "next/link";
import { useState } from "react";
import type { AnimalOption } from "@/core/modules/animals/types";
import type { PromptSettings } from "@/core/modules/settings/types";
import { Badge } from "@/components/design/Badge";
import { Textarea } from "@/components/design/form";
import { MAX_PROMPT_LENGTH } from "@/data/prompts";
import { SaveBar, SettingsCard } from "./SettingsParts";
import { useSettingsSave } from "./useSettingsSave";

const linkClassName =
  "font-label text-sm font-bold text-medium-green underline underline-offset-4 hover:text-orange disabled:text-text-muted disabled:no-underline";

type PromptSettingsFormProps = {
  prompts: PromptSettings;
  defaults: PromptSettings;
  /** The animals of the personalised Palley, in their order there. */
  animals: AnimalOption[];
};

/*
 * The general prompt on top, then every animal with its full prompt. An animal without a prompt of its own shows (and
 * uses) the general one; editing it gives it its own. Only the animals in the list are saved.
 */
export function PromptSettingsForm({ prompts, defaults, animals }: PromptSettingsFormProps) {
  const [base, setBase] = useState(prompts.base);
  const [own, setOwn] = useState<Record<string, string>>(() =>
    Object.fromEntries(animals.flatMap((animal) => (prompts.animals[animal.code]?.trim() ? [[animal.code, prompts.animals[animal.code]]] : []))),
  );
  const { save, saving, message, error } = useSettingsSave("prompts");

  const setAnimalPrompt = (code: string, text: string | null) =>
    setOwn((current) => {
      const rest = Object.fromEntries(Object.entries(current).filter(([key]) => key !== code));
      return text === null ? rest : { ...rest, [code]: text };
    });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save({ base, animals: own });
      }}
      className="flex flex-col gap-6"
    >
      <SettingsCard
        title="Algemene prompt"
        intro="Voor elk dier zonder eigen prompt (zoals een nieuw dier), en het vertrekpunt voor een nieuwe collectible."
      >
        <Textarea
          id="prompt-base"
          aria-label="Algemene prompt"
          rows={14}
          maxLength={MAX_PROMPT_LENGTH}
          value={base}
          onChange={(event) => setBase(event.target.value)}
          className="min-h-72 font-mono text-sm!"
        />
        <div className="mt-2 flex justify-end">
          <button type="button" className={linkClassName} disabled={base === defaults.base} onClick={() => setBase(defaults.base)}>
            Standaardtekst terugzetten
          </button>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Per dier"
        intro="De volledige prompt die Nano Banana krijgt voor dit dier, voor het dier dat de klant koos (op de preview aan te passen). Pas hem hier helemaal aan."
      >
        <p className="-mt-2 mb-4 text-sm text-text-muted">
          De dieren komen van de pagina{" "}
          <Link href="/admin/settings/products" className="font-semibold underline underline-offset-4">
            Gepersonaliseerde Palley
          </Link>
          . Een nieuw dier verschijnt hier pas nadat je het daar toegevoegd en opgeslagen hebt.
        </p>
        <ul className="flex flex-col gap-3">
          {animals.map((animal) => {
            const custom = own[animal.code];
            const starting = defaults.animals[animal.code];
            return (
              <li key={animal.code}>
                <details className="group rounded-2xl border-[1.5px] border-off-white-dark">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                    <span className="font-label text-base font-bold">{animal.labels.nl}</span>
                    <Badge tone={custom !== undefined ? "success" : "waiting"}>
                      {custom !== undefined ? "Eigen prompt" : "Algemene prompt"}
                    </Badge>
                  </summary>
                  <div className="border-t border-off-white-dark p-4">
                    <Textarea
                      aria-label={`Prompt voor ${animal.labels.nl}`}
                      rows={12}
                      maxLength={MAX_PROMPT_LENGTH}
                      value={custom ?? base}
                      onChange={(event) => setAnimalPrompt(animal.code, event.target.value)}
                      className="min-h-64 font-mono text-sm!"
                    />
                    <div className="mt-2 flex flex-wrap justify-end gap-4">
                      {starting && custom !== starting && (
                        <button type="button" className={linkClassName} onClick={() => setAnimalPrompt(animal.code, starting)}>
                          Startprompt voor dit dier
                        </button>
                      )}
                      <button
                        type="button"
                        className={linkClassName}
                        disabled={custom === undefined}
                        onClick={() => setAnimalPrompt(animal.code, null)}
                      >
                        Algemene prompt gebruiken
                      </button>
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </SettingsCard>

      <SaveBar saving={saving} message={message} error={error} />
    </form>
  );
}
