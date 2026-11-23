import "server-only";
import type { ReactNode } from "react";
import type { ConfiguratorAddon } from "@/components/functional/create/AddonToggles";
import { getMessages } from "@/core/locale/server";
import { getOrderableAddons } from "@/core/modules/addons/service";
import { getActiveSeason } from "@/core/modules/seasons/service";
import type { ActiveSeason } from "@/core/modules/seasons/types";
import { addonLabel, type Addon } from "@/data/addons";
import type { SeasonId } from "@/data/seasons";
import { christmasConfigurator } from "./christmas/configurator";

/** A season's additions to the configurator: texts (and a picture) per extra, and a tip under the keychain choice. */
export type SeasonConfigurator = (season: ActiveSeason) => Promise<{
  addons: Partial<Record<Addon, { text: string; icon?: ReactNode }>>;
  keychainTip: string | null;
}>;

const SEASON_CONFIGURATORS: Record<SeasonId, SeasonConfigurator> = { christmas: christmasConfigurator };

export type SeasonalConfiguratorProps = { addons: ConfiguratorAddon[]; keychainTip: string | null };

const NOTHING: SeasonalConfiguratorProps = { addons: [], keychainTip: null };

/**
 * What the active season adds to the configurator: the extras that can be ordered now, with their price and texts.
 * Nothing outside a season. Dynamic: call it inside the configurator's Suspense boundary.
 */
export async function getSeasonalConfigurator(): Promise<SeasonalConfiguratorProps> {
  const season = await getActiveSeason();
  if (!season) return NOTHING;
  const [orderable, extras, { options }] = await Promise.all([
    getOrderableAddons(),
    SEASON_CONFIGURATORS[season.id](season),
    getMessages(),
  ]);
  return {
    addons: orderable.flatMap(({ value, priceCents }) => {
      const texts = extras.addons[value];
      // An extra without texts isn't offered: better nothing than an unexplained switch.
      return texts ? [{ value, label: options.addons[value] ?? addonLabel(value), priceCents, ...texts }] : [];
    }),
    keychainTip: extras.keychainTip,
  };
}
