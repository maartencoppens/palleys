import Button from "@/components/design/Button";
import HeroArt from "./HeroArt";
import InfoBanner from "./InfoBanner";
import Navbar from "@/components/functional/shop/layout/Navbar";

/*
 * Desktop measurements come from the 1440×780 Figma frame: navbar inset 64.5px (page-container),
 * content inset 108px, and the content block sits 145px below the navbar. The rounded bottom-left
 * corner uses the shared section radius, so it shrinks on smaller screens like the other sections.
 * The section has no background of its own: the artwork covers it completely, and a dark background
 * underneath would show as a thin rim along the rounded corner.
 */
export default function Hero() {
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
           */}
          <div className="flex flex-1 flex-col items-start justify-center gap-8 pt-14 pb-40 md:gap-2xl lg:pt-[55px] lg:pb-0 lg:pl-[clamp(0px,3.02vw,58px)]">
            <h1
              id="hero-title"
              className="font-display text-[clamp(2.375rem,1.2rem+4.6vw,4.875rem)] leading-[0.98] font-medium tracking-[-0.045em]"
            >
              <span className="block text-title-accent" data-hero-item>
                A pal
              </span>{" "}
              <span className="block" data-hero-item>
                for your keys.
              </span>
            </h1>

            <p
              data-hero-item
              className="max-w-[570px] text-[clamp(1.0625rem,0.95rem+0.35vw,1.25rem)] leading-[1.485]"
            >
              Maak kennis met je Palley: je huisdier als 3D-geprinte
              sleutelhanger, gemaakt van je favoriete foto en met de hand
              afgewerkt. Je beste vriend, klein genoeg om overal mee te gaan.
            </p>

            <div
              data-hero-item
              className="flex w-full max-w-[400px] flex-col items-stretch gap-s lg:w-auto lg:max-w-none lg:flex-row lg:items-center lg:gap-0"
            >
              <Button href="/create">Maak je Palley</Button>
              <Button href="/#collectables" variant="bare">
                Bekijk de collectie
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
