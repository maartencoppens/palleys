import HeroArt from "@/components/functional/shop/home/HeroArt";
import InfoBanner from "@/components/functional/shop/home/InfoBanner";
import Navbar from "@/components/functional/shop/layout/Navbar";

type PageHeroProps = {
  /** Small uppercase line above the title. */
  eyebrow: string;
  title: string;
  intro: string;
  /** Background of the section below, which shows through the rounded bottom-left corner. */
  backdropClassName?: string;
};

/*
 * Hero for secondary pages (about, shop, legal): info banner, navbar and a big title, on the same scene as the
 * homepage hero (organic shapes, leaves and flowers that sway) and with its rounded bottom-left corner, so every
 * page opens in the same world. The scene is pinned to the bottom-left, so on this shorter hero the foliage still
 * runs along the bottom edge and nothing is cut off at the side.
 */
export default function PageHero({ eyebrow, title, intro, backdropClassName = "bg-off-white" }: PageHeroProps) {
  return (
    // A div, not a <header>: the navbar inside is already the page header.
    <div className={backdropClassName}>
      <div className="relative overflow-hidden rounded-bl-section-lg bg-medium-green text-off-white">
        <InfoBanner />

        {/* On phones the two flowers on the left edge would sit behind the intro text. */}
        <div className="relative max-md:[&_#flower7]:hidden max-md:[&_#flowers2]:hidden">
          <HeroArt variant="page" />

          <div className="page-container relative py-m">
            <Navbar />
          </div>

          <div className="page-container relative pt-10 pb-[clamp(150px,28vw,210px)] md:pt-[clamp(48px,6vw,90px)] lg:pb-[clamp(150px,15vw,220px)]">
            <div className="flex max-w-[880px] flex-col gap-6 lg:pl-[clamp(0px,3.02vw,58px)]">
              <p
                data-hero-item
                className="font-label text-[15px] leading-[normal] font-semibold tracking-[1.5px] text-title-accent uppercase"
              >
                {eyebrow}
              </p>
              <h1
                data-hero-item
                className="font-display text-[clamp(1.75rem,0.9rem+4.8vw,5rem)] leading-none font-medium tracking-[-0.02em] [overflow-wrap:break-word] hyphens-auto"
              >
                {title}
              </h1>
              <p data-hero-item className="max-w-[620px] text-lg leading-[1.5] text-pretty md:text-xl">
                {intro}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
