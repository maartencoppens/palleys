import {
  ChristmasTree,
  Gift,
  PawTrail,
  Snowfall,
  Snowflake,
  SnowHills,
} from "@/components/design/seasonal/christmas/Art";
import { HangingOrnament } from "./HangingOrnament";

/*
 * The Christmas scene over the hero illustration, behind the text: snowfall, baubles on strings from the info banner,
 * a few big flakes, a snowy ground with paw prints, and a tree with presents on a heap of snow.
 *
 * From xl the tree stands between the text and the carousel; smaller, it stands in the bottom-right corner, behind the
 * content (which is drawn over this layer).
 */
export function ChristmasHeroDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none" aria-hidden>
      <Snowfall className="absolute inset-0" />

      <HangingOrnament className="left-[30%] md:left-[21%]" stringClassName="h-8 md:h-12" sizeClassName="w-8 md:w-11" />
      <HangingOrnament
        className="hidden md:left-[29%] md:flex"
        stringClassName="h-4"
        sizeClassName="w-9"
        variant="paw"
      />

      <Snowflake className="absolute top-[22%] left-[6%] hidden w-6 opacity-80 md:block" />
      <Snowflake className="absolute top-[18%] left-[64%] hidden w-5 opacity-70 lg:block" />
      <Snowflake className="absolute top-[26%] right-[8%] hidden w-6 opacity-80 md:block" />

      <div className="absolute right-[3%] bottom-[1.5%] w-[clamp(84px,22vw,150px)] xl:right-auto xl:bottom-[8%] xl:left-[51%] xl:w-[clamp(190px,16vw,280px)]">
        <span className="absolute -inset-x-[14%] bottom-[-3%] h-[9%] rounded-[50%] bg-off-white" />
        <ChristmasTree className="relative h-auto w-full" />
        <Gift variant="red" className="absolute bottom-[-2%] left-[-14%] h-auto w-[26%]" />
        <Gift variant="yellow" className="absolute bottom-[-2%] left-[10%] h-auto w-[20%]" />
        <Gift variant="red" className="absolute right-[-10%] bottom-[-2%] h-auto w-[24%]" />
      </div>

      <SnowHills className="absolute inset-x-0 bottom-0 h-[40px] w-full md:h-[64px] xl:h-[84px]" />
      <PawTrail className="absolute bottom-[6px] left-[20%] hidden h-auto w-[200px] sm:block md:w-[260px]" />
    </div>
  );
}
