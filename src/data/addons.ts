import type { SeasonId } from "./seasons";

/*
 * Extras on a personalised Palley that change what gets made, like a Santa hat. Each belongs to a season and can only
 * be ordered while that season is on (core/modules/addons); an order keeps its extras after the season ends.
 *
 * An extra changes the pose prompt (its text: data/prompts.ts, editable in /admin/settings/prompts), may cost extra
 * (/admin/settings/season) and is shown everywhere the backoffice shows the order. Adding one: a line here, its prompt,
 * and its shop texts under messages.options.addons (+ the season's texts for the configurator).
 *
 * Labels are the backoffice's and the order title's (Dutch).
 */
export const ADDONS = [
  {
    value: "santa-hat",
    label: "Met kerstmuts",
    season: "christmas",
    // What the team checks on the pose and the model before approving (human in the loop).
    check: "Muts printbaar: punt tegen kop of rug, pompon vast aan het lijf, geen dunne of losse randen.",
  },
] as const satisfies readonly { value: string; label: string; season: SeasonId; check: string }[];

export type Addon = (typeof ADDONS)[number]["value"];
export const ADDON_VALUES = ADDONS.map((addon) => addon.value) as [Addon, ...Addon[]];

/** The most an extra may cost, in cents (a typo guard for the backoffice). */
export const MAX_ADDON_PRICE_CENTS = 5_000;

export function isAddon(value: unknown): value is Addon {
  return typeof value === "string" && (ADDON_VALUES as readonly string[]).includes(value);
}

/** Known extras only, once each, in the order of ADDONS: how they're stored and shown. */
export function normalizeAddons(values: readonly unknown[] | null | undefined): Addon[] {
  const chosen = new Set((values ?? []).filter(isAddon));
  return ADDON_VALUES.filter((value) => chosen.has(value));
}

export const addonLabel = (value: Addon) => ADDONS.find((addon) => addon.value === value)!.label;

/** The extra whose (Dutch) label this is, e.g. from the labels the backoffice gets. */
export const addonByLabel = (label: string) => ADDONS.find((addon) => addon.label === label) ?? null;

/** The extras of a season, in their order. */
export const addonsOfSeason = (season: SeasonId): Addon[] =>
  ADDONS.filter((addon) => addon.season === season).map((addon) => addon.value);
