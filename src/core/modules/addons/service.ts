import "server-only";
import { addonsOfSeason, normalizeAddons, type Addon } from "@/data/addons";
import { getActiveSeason } from "@/core/modules/seasons/service";
import { getShopSettings } from "@/core/modules/settings/service";

export type OrderableAddon = { value: Addon; priceCents: number };

/**
 * The extras that can be ordered right now: those of the active season (live, or previewed in this browser), with
 * their price. None outside a season. Dynamic (reads the season cookie): call within a request.
 */
export async function getOrderableAddons(): Promise<OrderableAddon[]> {
  const season = await getActiveSeason();
  if (!season) return [];
  const { seasonal } = await getShopSettings();
  return addonsOfSeason(season.id).map((value) => ({ value, priceCents: seasonal.addonPrices[value] ?? 0 }));
}

/** The requested extras, normalised; null when one of them can't be ordered now (the cart refuses the line). */
export async function orderableAddons(requested: readonly unknown[] | undefined): Promise<Addon[] | null> {
  const chosen = normalizeAddons(requested);
  if (chosen.length === 0) return [];
  const orderable = new Set((await getOrderableAddons()).map((addon) => addon.value));
  return chosen.every((addon) => orderable.has(addon)) ? chosen : null;
}
