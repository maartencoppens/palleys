import { addonLabel, normalizeAddons, type Addon } from "@/data/addons";
import { DEFAULT_ADDON_PROMPTS } from "@/data/prompts";
import type { PromptSettings, SeasonalSettings } from "@/core/modules/settings/types";

/*
 * Pure helpers for the extras on a Palley (data/addons.ts): price, title and prompt. Shared by the cart, checkout, the
 * previews and the backoffice, so they all agree.
 */

/** What the extras cost together, in cents, from the season settings. */
export function addonsPriceCents(addons: readonly Addon[], prices: SeasonalSettings["addonPrices"]): number {
  return addons.reduce((sum, addon) => sum + (prices[addon] ?? 0), 0);
}

/** The extras' Dutch labels, for the order title and the backoffice. */
export const addonLabels = (addons: readonly unknown[] | null | undefined) => normalizeAddons(addons).map(addonLabel);

/** A title with the extras added, e.g. "Palley Hond · Met sleutelhanger · Klemmetje · Met kerstmuts". */
export function titleWithAddons(title: string, addons: readonly unknown[] | null | undefined) {
  return [title, ...addonLabels(addons)].join(" · ");
}

/** The prompt text of each chosen extra, from the settings or else its starting text, to add after the pose prompt. */
export function addonPrompts(addons: readonly unknown[] | null | undefined, prompts: Pick<PromptSettings, "addons">) {
  return normalizeAddons(addons).map((addon) => prompts.addons?.[addon]?.trim() || DEFAULT_ADDON_PROMPTS[addon]);
}
