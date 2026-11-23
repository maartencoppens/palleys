import { SantaHat } from "@/components/design/seasonal/christmas/Art";
import type { SeasonSlotProps } from "../types";
import { fill } from "@/core/locale/fill";
import { christmasCopy } from "./copy";

/* A light, dashed note under the hero text: the Christmas news without pulling attention from the title and button. */
export async function ChristmasHeroNote({ season }: SeasonSlotProps) {
  const { m, date } = await christmasCopy(season);
  return (
    <p className="flex max-w-[560px] items-center gap-3 rounded-xl border-[1.5px] border-dashed border-off-white/35 px-4 py-2.5 text-sm leading-[1.45] text-off-white/90 md:text-base">
      <SantaHat className="h-auto w-9 shrink-0" />
      <span>
        {m.heroNote}
        {date && <> {fill(m.heroNoteDeadline, { date })}</>}
      </span>
    </p>
  );
}
