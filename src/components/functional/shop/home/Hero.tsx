import Button from "@/components/design/Button";
import HeroArt from "./HeroArt";
import HeroCarousel from "./HeroCarousel";
import InfoBanner from "./InfoBanner";
import Navbar from "@/components/functional/shop/layout/Navbar";
import { getMessages } from "@/core/locale/server";

/*
 * Desktop measurements come from the 1440×780 Figma frame: navbar inset 64.5px (page-container),
 * content inset 108px, and the content block sits 145px below the navbar. The rounded bottom-left
 * corner uses the shared section radius, so it shrinks on smaller screens like the other sections.
 * The section has no background of its own: the artwork covers it completely, and a dark background
 * underneath would show as a thin rim along the rounded corner.
 *
 * The carousel with the steps from photo to Palley fills the empty right half from 1280px; on smaller
 * screens it follows the copy, at the bottom of the first screen.
 */
export default async function Hero() {
  const { hero: m, common } = await getMessages();
  return (
    <section
      className="flex min-h-svh flex-col overflow-hidden rounded-bl-section-lg"
      aria-labelledby="hero-title"
    >
      <InfoBanner />

      {/* The info banner is part of the first screen, so the scene and content share what's left below it. */}
      <div className="relative flex flex-1">
        <HeroArt />

        <div className="page-container relative flex flex-col py-m">
          <Navbar />

          {/*
           * Vertically centred in the space under the navbar. The extra top padding reproduces the
           * Figma placement when the area below the banner is 780px tall; on other heights the block stays centred.
           *
           * The title is a lockup: the brand name large, the tagline smaller, so the two lines read as one
           * block instead of a short line over a long one. The copy below is exactly as wide as the title:
           * from 1024px the title sets the column width, and contain: inline-size keeps the paragraph and the
           * buttons from widening it. On phones the copy simply uses the full width.
           */}
          <div className="flex flex-1 flex-col justify-center pt-14 pb-20 lg:pt-[55px] xl:pb-0 lg:pl-[clamp(0px,3.02vw,58px)]">
            <div className="grid w-full justify-items-start gap-8 md:gap-2xl lg:w-fit">
              <h1
                id="hero-title"
                className="w-max max-w-full font-display leading-[0.98] font-medium tracking-[-0.04em]"
              >
                <span
                  className="block text-[clamp(3rem,1.6rem+6vw,6.25rem)] leading-[0.9] text-title-accent"
                  data-hero-item
                >
                  {m.titleAccent}
                </span>{" "}
                <span
                  className="block text-[clamp(1.875rem,1.05rem+3.5vw,3.875rem)]"
                  data-hero-item
                >
                  {m.titleRest}
                </span>
              </h1>

              <p
                data-hero-item
                className="justify-self-stretch text-[clamp(1.0625rem,0.95rem+0.35vw,1.25rem)] leading-[1.485] text-pretty lg:[contain:inline-size]"
              >
                {m.text}
              </p>

              <div
                data-hero-item
                className="flex w-full max-w-[400px] flex-col items-stretch gap-s lg:max-w-none lg:flex-row lg:items-center lg:gap-0 lg:[contain:inline-size]"
              >
                <Button href="/create">{common.createPalley}</Button>
                <Button href="/#collectables" variant="bare">
                  {m.collection}
                </Button>
              </div>
            </div>
          </div>

          <HeroCarousel m={m.flow} />
        </div>
      </div>
    </section>
  );
}
