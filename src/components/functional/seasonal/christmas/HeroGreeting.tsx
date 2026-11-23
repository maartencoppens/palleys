import { Star } from "@/components/design/seasonal/christmas/Art";
import type { SeasonSlotProps } from "../types";
import { christmasCopy } from "./copy";

// An 18-point scalloped badge, as drawn in Figma (outer radius 66, inner 58).
const STICKER_PATH =
  Array.from({ length: 36 }, (_, index) => {
    const angle = (Math.PI * index) / 18 - Math.PI / 2;
    const radius = index % 2 === 0 ? 66 : 58;
    return `${index === 0 ? "M" : "L"}${(66 + radius * Math.cos(angle)).toFixed(1)} ${(66 + radius * Math.sin(angle)).toFixed(1)}`;
  }).join("") + "Z";

/*
 * Above the hero title: a "Merry Pawmas!" pill. From xl also a scalloped sticker beside the title ("New! with a Santa
 * hat"); the hero text column is relative, so the sticker hangs off its top-right corner.
 */
export async function ChristmasHeroGreeting({ season }: SeasonSlotProps) {
  const { m } = await christmasCopy(season);
  return (
    <>
      <p className="flex items-center gap-2 rounded-full bg-coral py-1.5 pr-4 pl-3 font-display text-lg font-bold text-off-white md:text-xl">
        <Star className="size-5" />
        {m.greeting}
      </p>
      <p
        className="absolute top-2 -right-36 hidden size-[124px] rotate-[-12deg] place-items-center text-center font-display text-lg leading-none font-bold text-off-white xl:grid"
        aria-hidden
      >
        <svg className="absolute inset-0 size-full" viewBox="0 0 132 132" aria-hidden>
          <path fill="#EF7550" d={STICKER_PATH} />
          <circle cx="66" cy="66" r="52" fill="none" stroke="#F5F2E4" strokeWidth="2" strokeDasharray="4 4" />
        </svg>
        <span className="relative">
          {m.sticker.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </span>
      </p>
    </>
  );
}
