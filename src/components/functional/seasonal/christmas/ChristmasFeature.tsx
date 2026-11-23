import Button from "@/components/design/Button";
import {
  ChristmasTree,
  Gift,
  SnowHills,
  Star,
  StringLights,
} from "@/components/design/seasonal/christmas/Art";
import { fill } from "@/core/locale/fill";
import type { SeasonSlotProps } from "../types";
import { christmasCopy } from "./copy";
import { ChristmasPalleyPhoto } from "./PalleyPhoto";

/*
 * The Christmas edition announced in a section of its own, right after the hero: a green card with lights along the
 * top and snow along the bottom, the news and the order deadline on one side, and on the other a Palley in a blob
 * with a gift tag, presents and a small tree.
 *
 * Stacked below lg; side by side from lg. The lights repeat to fill any width.
 */
export async function ChristmasFeature({ season }: SeasonSlotProps) {
  const { m, date } = await christmasCopy(season);
  return (
    <section aria-labelledby="christmas-feature-title" className="bg-page section-x pt-12 md:pt-16 lg:pt-20">
      <div className="relative mx-auto flex w-full max-w-[1260px] flex-col gap-10 overflow-hidden rounded-[32px] bg-medium-green px-6 pt-20 pb-28 text-off-white md:rounded-[48px] md:px-12 md:pt-24 md:pb-32 lg:flex-row lg:items-center lg:gap-12 lg:px-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 flex" aria-hidden>
          {[0, 1, 2, 3].map((copy) => (
            <StringLights key={copy} wire="dark" className="h-auto w-[360px] shrink-0 md:w-[480px] lg:w-[630px]" />
          ))}
        </div>

        <div className="relative flex flex-col items-start gap-5 lg:flex-1">
          <p className="flex items-center gap-2 font-label text-xl font-semibold text-accent-highlights md:text-2xl">
            <Star className="size-6" />
            {m.feature.tag}
          </p>
          <h2
            id="christmas-feature-title"
            className="font-display text-[clamp(2rem,1.4rem+1.8vw,3rem)] leading-[1.22] font-medium"
          >
            {m.feature.title}
          </h2>
          <p className="max-w-[600px] text-base leading-[1.5] text-off-white/85 md:text-xl">{m.feature.text}</p>
          {date && (
            <p className="rounded-full bg-light-yellow px-5 py-2 font-label text-base font-bold text-banner-text md:text-lg">
              {fill(m.feature.deadline, { date })}
            </p>
          )}
          <Button href="/create">{m.feature.cta}</Button>
        </div>

        <div className="relative mx-auto w-full max-w-[420px] lg:mx-0 lg:w-[40%] lg:max-w-[480px]">
          <div className="relative aspect-square w-full bg-light-green mask-blob-2">
            <ChristmasPalleyPhoto alt={m.feature.photoAlt} sizes="(min-width: 1024px) 480px, 420px" className="object-[52%_50%]" />
          </div>
          <p
            className="absolute bottom-[14%] left-[-4%] rotate-[-10deg] rounded-[10px] bg-off-white px-4 py-2 font-display text-sm leading-[1.2] font-bold text-medium-green shadow-[0_8px_16px_-8px_rgb(0_0_0/0.4)] md:text-base"
            aria-hidden
          >
            <span className="block">{m.feature.tagTo}</span>
            <span className="block">{m.feature.tagFrom} 🐾</span>
          </p>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0" aria-hidden>
          <SnowHills className="h-[56px] w-full md:h-[80px]" />
          <div className="absolute right-[6%] bottom-[18px] flex items-end gap-1 md:right-[5%]">
            <Gift variant="teal" className="h-auto w-10 md:w-14" />
            <Gift variant="red" className="h-auto w-12 md:w-16" />
            <Gift variant="yellow" className="h-auto w-9 md:w-12" />
            <ChristmasTree className="ml-2 h-auto w-16 md:w-24" />
          </div>
        </div>
      </div>
    </section>
  );
}
