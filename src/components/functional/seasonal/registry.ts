import type { SeasonId } from "@/data/seasons";
import { christmasSlots } from "./christmas";
import type { SeasonSlots } from "./types";

/** What each season adds where. A new season: a folder next to christmas/ with its slots, registered here. */
export const SEASON_SLOTS: Record<SeasonId, SeasonSlots> = {
  christmas: christmasSlots,
};
