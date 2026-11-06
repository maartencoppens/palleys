import Image from "next/image";
import { getMessages } from "@/core/locale/server";

/*
 * "Our story" (Figma: story, 1440×736). The photo, its organic corners and the leaf and flowers on top
 * are exported from Figma as one 2× image. Image and text sit side by side from 1024px and stack below.
 */
export default async function Story() {
  const { about } = await getMessages();
  const m = about.story;
  return (
    <section
      id="story"
      aria-labelledby="story-title"
      className="mx-auto flex max-w-[1440px] flex-col items-center stack section-x section-y lg:flex-row lg:gap-[clamp(40px,5.6vw,80px)] lg:pt-20"
    >
      <Image
        data-animate="pop"
        className="h-auto w-full max-w-[420px] shrink-0 lg:w-[clamp(380px,38.9vw,560px)] lg:max-w-none"
        src="/images/about/story-pets.png"
        width={560}
        height={560}
        alt={m.photoAlt}
        sizes="(min-width: 1024px) 560px, 420px"
      />

      <div data-animate="fade-up" className="flex flex-col gap-5 md:gap-6">
        <p className="font-label text-lg font-bold text-orange">{m.tag}</p>
        <h2
          id="story-title"
          className="font-display text-[clamp(2rem,1.4rem+1.8vw,3rem)] leading-[1.1] font-medium text-medium-green"
        >
          {m.title}
        </h2>
        <div className="flex flex-col gap-5 text-lg leading-[1.5] text-text-primary md:gap-6 md:text-xl">
          {m.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
