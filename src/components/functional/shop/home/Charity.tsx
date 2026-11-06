import Image from "next/image";
import { Link } from "@/core/locale/client";
import { getMessages } from "@/core/locale/server";
import CharityTag from "./CharityTag";

/*
 * "Little pal. Big impact" (Figma: charity-section, 1440×832): green block with 160px rounded corners
 * top-right and bottom-left, so the cream page background of the section above shows in the corner.
 *
 * Spacing differs from Figma on purpose. Figma puts 50px between every element and lets the text run
 * up to 21px from the rounded edge; here the header and its intro sit closer together, the tag gets
 * more room for its rays, and the column keeps a comfortable distance from the edge.
 *
 * `flowsIntoFooter` drops the bottom corner and bottom padding, for pages where the green continues
 * straight into the footer (the about page), so the CTA card sits on one green surface. Otherwise the block stops at
 * 1440px like the other sections; flowing into the full-width footer it stays full width, its content is centred anyway.
 */
export default async function Charity({
  flowsIntoFooter = false,
}: {
  flowsIntoFooter?: boolean;
}) {
  const { charity: m } = await getMessages();
  return (
    <section
      id="charity"
      className={`flex min-h-svh flex-col justify-center stack overflow-hidden rounded-tr-section bg-medium-green section-x section-pt lg:flex-row lg:items-center lg:gap-[clamp(32px,3.5vw,56px)] lg:pt-12 lg:pr-[clamp(40px,5vw,80px)] lg:pl-5 ${flowsIntoFooter ? "section-pb lg:pb-12" : "mx-auto w-full max-w-[1440px] rounded-bl-section section-pb lg:pb-12"}`}
      aria-labelledby="charity-title"
    >
      {/* Stand-in until there's a photo of Dierenasiel Gent. The circle cuts off the cream corners of this image. */}
      <Image
        data-animate="pop"
        className="h-auto w-full max-w-[420px] self-center rounded-full lg:max-w-[560px] lg:min-w-0 lg:flex-[1_1_560px]"
        src="/images/about/story-pets.png"
        width={560}
        height={560}
        alt={m.photoAlt}
        sizes="(min-width: 1024px) 560px, 420px"
      />

      <div className="flex flex-col items-start lg:w-[550px] lg:shrink-0">
        <header data-animate="fade-up" className="flex flex-col gap-s">
          <p className="font-label text-xl leading-[19.5px] font-semibold text-accent-highlights md:text-2xl">
            {m.tag}
          </p>
          <h2
            id="charity-title"
            className="flex flex-col gap-1 font-display text-[clamp(2rem,1.4rem+1.8vw,3rem)] leading-[1.22] font-medium text-off-white md:gap-s"
          >
            <span>{m.titleLine1}</span>
            <span>{m.titleLine2}</span>
          </h2>
        </header>

        <p
          data-animate="fade-up"
          className="mt-6 max-w-[502px] font-label text-[clamp(1.25rem,0.95rem+1vw,2rem)] leading-[1.3] font-medium text-off-white md:mt-8"
        >
          {m.text}
        </p>

        {/* The tag is a fixed 550px composition; `zoom` scales it down on narrow screens. */}
        <div className="mt-8 [zoom:0.6] sm:[zoom:0.85] md:mt-12 lg:[zoom:0.8] xl:[zoom:1]">
          <CharityTag />
        </div>

        <Link
          href="https://www.dierenasielgent.be/"
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-8 flex items-center gap-2.5 border-b border-light-green py-s text-xl leading-[19.5px] font-bold text-off-white transition-colors hover:border-accent-highlights md:mt-10 md:text-2xl"
        >
          {m.link}
          {/* Figma rotates the standard arrow by -31.9° inside a 36×34 box. */}
          <span
            className="grid h-[33.935px] w-[35.969px] place-items-center"
            aria-hidden
          >
            <Image
              className="max-w-none -rotate-[31.9deg] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              src="/images/arrow-diagonal.svg"
              width={30.0476}
              height={23.7037}
              alt=""
            />
          </span>
        </Link>
      </div>
    </section>
  );
}
