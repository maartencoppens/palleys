import { SantaHat } from "@/components/design/seasonal/christmas/Art";
import type { SeasonConfigurator } from "../configurator";
import { christmasCopy } from "./copy";

/** What the Christmas edition adds to the configurator: the Santa hat's text and picture, and the clip tip. */
export const christmasConfigurator: SeasonConfigurator = async (season) => {
  const { m } = await christmasCopy(season);
  return {
    addons: { "santa-hat": { text: m.configurator.santaHat, icon: <SantaHat className="h-auto w-9 shrink-0" /> } },
    keychainTip: m.configurator.clipTip,
  };
};
