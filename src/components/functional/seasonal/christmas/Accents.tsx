import { SantaHat, SnowEdge, Star, StringLights } from "@/components/design/seasonal/christmas/Art";
import { fill } from "@/core/locale/fill";
import type { SeasonSlotProps } from "../types";
import { christmasCopy } from "./copy";
import { HangingOrnament } from "./HangingOrnament";

/*
 * No data-animate in seasonal slots: they stream in after SiteAnimations has run, so GSAP would style them before React
 * hydrates them (a hydration mismatch).
 *
 * The small Christmas touches per section. Each is absolutely positioned within its slot's container (the section is
 * relative), so the section's own layout never changes.
 */

/*
 * Santa hats sit on things with their brim: in the hat artwork (142×96) the brim's bottom is at ~97% of the height and
 * its middle at ~42% of the width. Every placement below lines that point up with the top edge of what it sits on and
 * lets the brim overlap it a little, rotating around the brim (origin-bottom) so it stays seated.
 */

/*
 * On a HowItWorks number badge (the 60px blob at top -18px, left 13px in the step's 270px artwork box, which scales as
 * a whole on small screens): brim centred on the badge (x 43) and covering its top ~10px, clear of the number.
 */
export function ChristmasStepHat() {
  return (
    <SantaHat className="pointer-events-none absolute -top-[46px] left-[19px] h-auto w-[58px] origin-bottom -rotate-[10deg]" />
  );
}

/** Under the HowItWorks steps: when to order for delivery before Christmas. */
export async function ChristmasHowItWorksNote({ season }: SeasonSlotProps) {
  const { m, date } = await christmasCopy(season);
  return (
    <p
      className="flex max-w-[680px] items-center gap-3 rounded-full bg-light-yellow px-5 py-3 text-left font-label text-base font-bold text-banner-text md:text-lg"
    >
      <Star className="size-5 shrink-0" />
      {date ? fill(m.howItWorksDeadline, { date }) : m.howItWorksNoDeadline}
    </p>
  );
}

/** Baubles hanging into the featured collection, one on the left and two on the right. */
export function ChristmasCollectionOrnaments() {
  return (
    <>
      <HangingOrnament
        className="left-[6%] md:left-[9%]"
        stringClassName="h-16 md:h-28"
        sizeClassName="w-9 md:w-12"
        variant="paw"
        stringColour="bg-medium-green/40"
      />
      <HangingOrnament
        className="right-[12%] hidden md:flex"
        stringClassName="h-16"
        sizeClassName="w-10"
        stringColour="bg-medium-green/40"
      />
      <HangingOrnament
        className="right-[5%] md:right-[6%]"
        stringClassName="h-24 md:h-36"
        sizeClassName="w-8 md:w-10"
        variant="teal"
        stringColour="bg-medium-green/40"
      />
    </>
  );
}

/*
 * A Santa hat hung on the top-right corner of the first featured cards' image area. Rendered inside the card (its
 * `decoration`), so it moves along when the card lifts on hover; the card clips, so it stays within the corner.
 */
export function ChristmasCardHat({ index }: SeasonSlotProps) {
  if (index > 1) return null;
  return (
    <SantaHat className="pointer-events-none absolute -top-1 right-1 h-auto w-[68px] origin-bottom rotate-[16deg]" />
  );
}

/*
 * On a team member's avatar (about page). Drawn in the member card, which centres the avatar under 24px (md: 32px) of
 * padding; the avatar is 128px (md: 160px). Brim centred on the avatar, covering its top ~14px. Alternating tilt.
 */
export function ChristmasTeamHat({ index }: SeasonSlotProps) {
  const tilt = index % 2 === 0 ? "-rotate-[12deg]" : "rotate-[10deg]";
  return (
    <SantaHat
      className={`pointer-events-none absolute -top-[9px] left-1/2 h-auto w-[72px] -translate-x-[42%] origin-bottom md:-top-[10px] md:w-[88px] ${tilt}`}
    />
  );
}

/** Snow lying on the top edge of Made in Gent, and lights along the top of the photo from lg. */
export function ChristmasMadeInGentSnow() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10" aria-hidden>
      <SnowEdge className="h-8 w-full md:h-12" />
      <StringLights wire="dark" className="absolute top-4 left-[3%] hidden h-auto w-[34%] lg:block" />
    </div>
  );
}

/** Baubles hanging from the top edge of the charity section, on the right. */
export function ChristmasCharityOrnaments() {
  return (
    <>
      <HangingOrnament className="right-[18%] hidden md:flex" stringClassName="h-20" sizeClassName="w-10" variant="paw" />
      <HangingOrnament className="right-[10%]" stringClassName="h-12 md:h-36" sizeClassName="w-9 md:w-12" />
      <HangingOrnament className="right-[4%]" stringClassName="h-6 md:h-10" sizeClassName="w-8 md:w-10" variant="teal" />
    </>
  );
}

/** Lights along the top of the footer's green area, repeated to fill the width. */
export function ChristmasFooterLights() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex overflow-hidden" aria-hidden>
      {[0, 1, 2, 3, 4].map((copy) => (
        <StringLights key={copy} wire="dark" className="h-auto w-[360px] shrink-0 md:w-[600px]" />
      ))}
    </div>
  );
}

/*
 * Lights across the top of the footer when it has no CTA card above it (shop, about…). In the flow rather than over the
 * footer, so they get their own room instead of hanging over the column titles.
 */
export function ChristmasFooterLightsStrip() {
  return (
    <div className="pointer-events-none flex h-[46px] overflow-hidden bg-medium-green md:h-[76px]" aria-hidden>
      {[0, 1, 2, 3, 4].map((copy) => (
        <StringLights key={copy} wire="dark" className="h-auto w-[360px] shrink-0 md:w-[600px]" />
      ))}
    </div>
  );
}

/** A holiday greeting under the footer tagline. */
export async function ChristmasFooterGreeting({ season }: SeasonSlotProps) {
  const { m } = await christmasCopy(season);
  return (
    <p className="flex items-center gap-2 font-display text-lg font-bold text-title-accent md:text-xl">
      <Star className="size-5 shrink-0" />
      {m.footerGreeting}
    </p>
  );
}
