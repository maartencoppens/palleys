import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { getActiveSeason } from "@/core/modules/seasons/service";
import { SEASON_SLOTS } from "./registry";
import type { SeasonSlot } from "./types";

type SeasonalProps = {
  slot: SeasonSlot;
  index?: number;
  /** Shown instead when no season is on or the season has nothing for this slot (for slots that replace something). */
  fallback?: ReactNode;
};

async function SeasonalSlot({ slot, index = 0, fallback = null }: SeasonalProps) {
  await connection();
  const season = await getActiveSeason();
  const Slot = season ? SEASON_SLOTS[season.id][slot] : undefined;
  return season && Slot ? <Slot season={season} index={index} /> : fallback;
}

/**
 * A place where the active season can add something (see types.ts). Streams in after the page, so the normal site is
 * never held up by it, and renders nothing (or the fallback) when no season is on or the season has nothing for this slot.
 */
export default function Seasonal(props: SeasonalProps) {
  return (
    <Suspense fallback={null}>
      <SeasonalSlot {...props} />
    </Suspense>
  );
}
