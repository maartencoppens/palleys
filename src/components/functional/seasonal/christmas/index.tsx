import { SeasonAttribute } from "../SeasonAttribute";
import type { SeasonSlotProps, SeasonSlots } from "../types";
import {
  ChristmasCardHat,
  ChristmasCharityOrnaments,
  ChristmasCollectionOrnaments,
  ChristmasFooterGreeting,
  ChristmasFooterLights,
  ChristmasFooterLightsStrip,
  ChristmasHowItWorksNote,
  ChristmasMadeInGentSnow,
  ChristmasStepHat,
  ChristmasTeamHat,
} from "./Accents";
import { ChristmasCtaPhoto } from "./CtaPhoto";
import { ChristmasPageHeroDecor, ChristmasPageHeroGreeting } from "./PageHero";
import { ChristmasFeature } from "./ChristmasFeature";
import { ChristmasHeroDecor } from "./HeroDecor";
import { ChristmasHeroGreeting } from "./HeroGreeting";
import { ChristmasHeroNote } from "./HeroNote";

function ChristmasRoot({ season }: SeasonSlotProps) {
  return <SeasonAttribute season={season.id} />;
}

/* Everything the Christmas edition adds, per slot (see ../types.ts). Leave a slot out to add nothing there. */
export const christmasSlots: SeasonSlots = {
  root: ChristmasRoot,
  heroDecor: ChristmasHeroDecor,
  heroBeforeTitle: ChristmasHeroGreeting,
  heroAfterText: ChristmasHeroNote,
  afterHero: ChristmasFeature,
  stepBadge: ChristmasStepHat,
  howItWorksAfter: ChristmasHowItWorksNote,
  collectionDecor: ChristmasCollectionOrnaments,
  collectibleCorner: ChristmasCardHat,
  madeInGentDecor: ChristmasMadeInGentSnow,
  charityDecor: ChristmasCharityOrnaments,
  footerDecor: ChristmasFooterLights,
  footerGreeting: ChristmasFooterGreeting,
  ctaPhoto: ChristmasCtaPhoto,
  pageHeroDecor: ChristmasPageHeroDecor,
  pageHeroBeforeTitle: ChristmasPageHeroGreeting,
  shopCardCorner: ChristmasCardHat,
  shopDecor: ChristmasCollectionOrnaments,
  teamAvatar: ChristmasTeamHat,
  footerTop: ChristmasFooterLightsStrip,
};
