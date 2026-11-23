"use client";

import type { ReactNode } from "react";
import { useLocale, useMessages } from "@/core/locale/client";
import { fill } from "@/core/locale/fill";
import { formatPrice } from "@/core/utils/format";
import type { Addon } from "@/data/addons";

/** An extra the configurator offers now (data/addons.ts), with its texts from the active season. */
export type ConfiguratorAddon = {
  value: Addon;
  label: string;
  /** What the customer gets, under the label. */
  text: string;
  priceCents: number;
  /** A small picture beside the label, e.g. a Santa hat. */
  icon?: ReactNode;
};

type AddonTogglesProps = {
  addons: ConfiguratorAddon[];
  value: Addon[];
  onChange: (value: Addon[]) => void;
};

/*
 * The extras as switches: each is on or off on its own (unlike the chips above, which pick one). A checkbox in a card,
 * so the whole card can be tapped and it works with the keyboard and screen readers.
 */
export default function AddonToggles({ addons, value, onChange }: AddonTogglesProps) {
  const { create, options } = useMessages();
  const locale = useLocale();
  if (addons.length === 0) return null;
  const toggle = (addon: Addon, on: boolean) =>
    onChange(on ? [...value.filter((item) => item !== addon), addon] : value.filter((item) => item !== addon));

  return (
    <fieldset className="flex flex-col gap-3.5">
      <legend className="mb-3.5 font-label text-lg font-semibold text-text-primary md:text-xl">{create.choose.extras}</legend>
      {addons.map((addon) => {
        const checked = value.includes(addon.value);
        return (
          <label key={addon.value} className="cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => toggle(addon.value, event.target.checked)}
              className="peer sr-only"
              aria-describedby={`addon-${addon.value}-text`}
            />
            <span className="flex items-start gap-4 rounded-[20px] border-[1.5px] border-medium-green bg-white p-4 transition-colors peer-checked:bg-light-green/40 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-highlights hover:bg-off-white md:p-5">
              {/* The switch: empty box, or a filled one with a tick. */}
              <span
                className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-[1.5px] border-medium-green ${checked ? "bg-medium-green" : "bg-white"}`}
                aria-hidden
              >
                {checked && (
                  <svg viewBox="0 0 16 12" className="w-3.5" fill="none">
                    <path d="M1.5 6.5 5.5 10.5 14.5 1.5" stroke="#F5F2E4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="flex items-center gap-2 font-label text-lg font-semibold text-medium-green">
                    {addon.icon}
                    {options.addons[addon.value] ?? addon.label}
                  </span>
                  <span className="font-label text-base font-bold text-medium-green">
                    {addon.priceCents > 0
                      ? fill(create.choose.addonPrice, { price: formatPrice(addon.priceCents / 100, locale) })
                      : create.choose.addonFree}
                  </span>
                </span>
                <span id={`addon-${addon.value}-text`} className="text-base leading-[1.5] text-text-primary">
                  {addon.text}
                </span>
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
