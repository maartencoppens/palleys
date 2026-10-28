import Image from "next/image";
import InfoBanner from "@/components/functional/shop/home/InfoBanner";
import Navbar from "@/components/functional/shop/layout/Navbar";

type PageHeroProps = {
  /** Small uppercase line above the title. */
  eyebrow: string;
  title: string;
  intro: string;
};

/*
 * Hero for secondary pages (Figma: page-hero): info banner, navbar and a big title on the dark green,
 * with a cluster of monstera leaves in the bottom-right corner. The leaves are Figma's own artwork,
 * exported at 2× with the green background made transparent.
 */
export default function PageHero({ eyebrow, title, intro }: PageHeroProps) {
  return (
    // A div, not a <header>: the navbar inside is already the page header.
    <div className="relative overflow-hidden bg-medium-green text-off-white">
      <InfoBanner />
      <div className="page-container relative py-m">
        <Navbar />
      </div>

      {/*
       * The wrapper floats gently (data-sway); the image inside slides in on load (data-animate).
       * It reaches 32px below the edge, so the swaying never shows the cut-off bottom of the leaves.
       */}
      <div
        data-sway="cluster"
        className="pointer-events-none absolute -bottom-8 right-0 z-0 w-[min(48vw,490px)]"
      >
        <Image
          data-animate="leaves"
          className="h-auto w-full select-none"
          src="/images/about/hero-leaves.png"
          width={490}
          height={518}
          alt=""
          aria-hidden
          priority
          sizes="(min-width: 1024px) 490px, 48vw"
        />
      </div>

      <div className="page-container relative pt-10 pb-[clamp(160px,30vw,220px)] md:pt-[clamp(48px,7.6vw,110px)] lg:pb-[clamp(140px,16vw,231px)]">
        <div className="flex max-w-[880px] flex-col gap-6 lg:pl-[clamp(0px,3.02vw,43.5px)]">
          <p
            data-hero-item
            className="font-label text-[15px] leading-[normal] font-semibold tracking-[1.5px] uppercase"
          >
            {eyebrow}
          </p>
          <h1
            data-hero-item
            className="font-display text-[clamp(2.75rem,1.5rem+4.4vw,5rem)] leading-none font-medium tracking-[-0.02em]"
          >
            {title}
          </h1>
          <p
            data-hero-item
            className="max-w-[620px] text-lg leading-[1.5] md:text-xl"
          >
            {intro}
          </p>
        </div>
      </div>
    </div>
  );
}
