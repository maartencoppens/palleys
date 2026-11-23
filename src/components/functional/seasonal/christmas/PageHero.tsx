import { ChristmasTree, Gift, Snowfall, Snowflake, SnowHills, Star } from "@/components/design/seasonal/christmas/Art";
import type { SeasonSlotProps } from "../types";
import { christmasCopy } from "./copy";
import { HangingOrnament } from "./HangingOrnament";

/*
 * The homepage hero's Christmas scene, scaled down for the shorter hero of the other pages (shop, about): snowfall,
 * baubles from the info banner, a few flakes, snow along the bottom and a tree with presents in the bottom-right
 * corner. The text column stays on the left, so the right side is free for the tree from md.
 */
export function ChristmasPageHeroDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none" aria-hidden>
      <Snowfall className="absolute inset-0" />

      <HangingOrnament className="right-[30%] hidden md:flex" stringClassName="h-10" sizeClassName="w-10" />
      <HangingOrnament className="right-[22%]" stringClassName="h-6 md:h-20" sizeClassName="w-8 md:w-11" variant="paw" />
      <HangingOrnament className="right-[8%]" stringClassName="h-12 md:h-8" sizeClassName="w-7 md:w-9" variant="teal" />

      <Snowflake className="absolute top-[30%] right-[40%] hidden w-6 opacity-70 lg:block" />
      <Snowflake className="absolute top-[46%] right-[14%] hidden w-5 opacity-80 md:block" />

      <div className="absolute right-[6%] bottom-[6px] w-[clamp(72px,16vw,190px)] md:bottom-[10px]">
        <span className="absolute -inset-x-[14%] bottom-[-3%] h-[9%] rounded-[50%] bg-off-white" />
        <ChristmasTree className="relative h-auto w-full" />
        <Gift variant="red" className="absolute bottom-[-2%] left-[-14%] h-auto w-[26%]" />
        <Gift variant="yellow" className="absolute bottom-[-2%] left-[10%] h-auto w-[20%]" />
        <Gift variant="teal" className="absolute right-[-10%] bottom-[-2%] h-auto w-[24%]" />
      </div>

      <SnowHills className="absolute inset-x-0 bottom-0 h-[32px] w-full md:h-[52px] xl:h-[68px]" />
    </div>
  );
}

/** Above a secondary page's eyebrow: the same "Merry Pawmas!" pill as on the homepage, without the sticker. */
export async function ChristmasPageHeroGreeting({ season }: SeasonSlotProps) {
  const { m } = await christmasCopy(season);
  return (
    <p className="flex w-fit items-center gap-2 rounded-full bg-coral py-1.5 pr-4 pl-3 font-display text-lg font-bold text-off-white md:text-xl">
      <Star className="size-5" />
      {m.greeting}
    </p>
  );
}
