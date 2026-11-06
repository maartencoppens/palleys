import Image from "next/image";
import { Link } from "@/core/locale/client";
import { getMessages } from "@/core/locale/server";

/*
 * "Ready to meet your pal?" (Figma: cta-card, 1280×534): cream text panel next to a bulldog keychain
 * photo (560px of 1280). Stacks with the photo on top below 1024px. A soft shadow keeps the card
 * readable when the band behind it is cream too (about page).
 */
export default async function CtaCard() {
  const { cta: m, common } = await getMessages();
  return (
    <article className="flex flex-col-reverse overflow-hidden rounded-[32px] bg-off-white shadow-[0_24px_60px_-24px_rgb(7_88_71/0.35)] ring-1 ring-medium-green/10 lg:min-h-[clamp(440px,37vw,534px)] lg:flex-row">
      <div className="flex flex-1 flex-col items-start justify-center gap-5 px-6 py-10 md:gap-6 md:px-12 md:py-14 lg:py-12 lg:pr-16 lg:pl-[72px]">
        <p className="font-label text-sm leading-[normal] font-semibold tracking-[1.4px] text-orange uppercase">
          {m.eyebrow}
        </p>
        <h2 className="font-display text-[clamp(2.25rem,1.2rem+3vw,3.5rem)] leading-[1.04] font-medium tracking-[-0.02em] text-medium-green">
          {m.title}
        </h2>
        <p className="text-lg leading-[1.6] text-text-primary">
          {m.text}
        </p>
        <Link
          href="/create"
          className="group flex items-center gap-3 rounded-full bg-orange py-[18px] pr-6 pl-7 font-label text-lg leading-[normal] font-semibold text-off-white transition hover:bg-orange-hover active:scale-[0.98]"
        >
          {common.createPalley}
          <span className="grid size-5 place-items-center" aria-hidden>
            <Image
              className="transition-transform group-hover:translate-x-1"
              src="/images/cta/arrow-right.svg"
              width={13.3333}
              height={13.3333}
              alt=""
            />
          </span>
        </Link>
      </div>

      <div className="relative h-60 shrink-0 sm:h-72 lg:h-auto lg:w-[43.75%]">
        <Image
          className="object-cover object-[50%_65%] lg:object-center"
          src="/images/cta/bulldog.jpg"
          alt={m.photoAlt}
          fill
          sizes="(min-width: 1024px) 560px, 100vw"
        />
      </div>
    </article>
  );
}
