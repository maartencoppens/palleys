import type { ComponentType } from "react";
import type { ActiveSeason } from "@/core/modules/seasons/types";

/*
 * The places on the website where a season can add something. Each is a <Seasonal slot="…" /> in a normal component;
 * without an active season it renders nothing, so the normal site never changes.
 */
export type SeasonSlot =
  /** Once per page, in the layout: marks <html data-season> for the `christmas:` CSS variant. */
  | "root"
  /** Behind the hero content, over the illustration (absolute, fills the hero). */
  | "heroDecor"
  /** First item of the hero text column, above the title. */
  | "heroBeforeTitle"
  /** In the hero text column, after the intro text. */
  | "heroAfterText"
  /** A section of its own right after the hero (homepage). */
  | "afterHero"
  /** On the number badge of a HowItWorks step (inside the 270px artwork box). */
  | "stepBadge"
  /** Under the HowItWorks steps. */
  | "howItWorksAfter"
  /** Over the featured collection section (absolute). */
  | "collectionDecor"
  /** Over the Made in Gent section (absolute). */
  | "madeInGentDecor"
  /** Over the charity section (absolute). */
  | "charityDecor"
  /** Along the top of the footer's green area (absolute). */
  | "footerDecor"
  /** Under the tagline in the footer. */
  | "footerGreeting"
  /** Over the scene of a secondary page's hero (PageHero: shop, about), behind the text (absolute, fills it). */
  | "pageHeroDecor"
  /** First item of a secondary page's hero text, above the eyebrow. */
  | "pageHeroBeforeTitle"
  /** Over the top of the shop page's product area, under the hero (absolute). */
  | "shopDecor"
  /** On a team member's card (about page, absolute within the card); gets the member's index. */
  | "teamAvatar"
  /** A strip at the top of the footer's green area when there's no CTA card above it (in the flow, so it adds height). */
  | "footerTop"
  /** The photo of the "Maak je Palley" CTA card (fills its photo area). Replaces the normal photo, given as fallback. */
  | "ctaPhoto";

export type SeasonSlotProps = { season: ActiveSeason; index: number };

export type SeasonSlots = Partial<Record<SeasonSlot, ComponentType<SeasonSlotProps>>>;
