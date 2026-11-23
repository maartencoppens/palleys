import { connection } from "next/server";
import { Suspense } from "react";
import { getLocale, getMessages, getSiteContent } from "@/core/locale/server";
import { DEFAULT_SITE_CONTENT } from "@/data/site-content";
import { getSeasonalExtras } from "@/core/modules/seasons/content";

function MessageList({ messages, hidden = false }: { messages: string[]; hidden?: boolean }) {
  return (
    <ul
      className={`flex shrink-0 items-center gap-[22px] pr-[22px] md:pr-0 christmas:md:pr-[22px] ${hidden ? "md:hidden christmas:md:flex" : ""}`}
      aria-hidden={hidden || undefined}
    >
      {messages.map((message, index) => (
        <li key={index} className="flex items-center gap-[22px] md:last:[&>span]:hidden christmas:md:last:[&>span]:inline">
          <p className="text-[11.1px] leading-[17px] font-bold tracking-[1.22px] whitespace-nowrap uppercase">
            {message}
          </p>
          <span className="text-[16.32px] leading-[25px] font-bold text-banner-dot italic christmas:text-title-accent" aria-hidden>
            •
          </span>
        </li>
      ))}
    </ul>
  );
}

/* Two identical lists; the track moves left by exactly one list's width, then repeats. */
function Track({ messages }: { messages: string[] }) {
  return (
    <div className="flex w-max animate-marquee motion-reduce:animate-none md:w-full md:animate-none md:justify-center christmas:md:w-max christmas:md:animate-marquee christmas:md:justify-start">
      <MessageList messages={messages} />
      <MessageList messages={messages} hidden />
    </div>
  );
}

async function LiveTrack() {
  await connection();
  const [content, extras] = await Promise.all([getSiteContent(), getSeasonalExtras()]);
  // A season (Christmas…) adds its own messages after the ones from the settings.
  return <Track messages={[...content.infoBannerMessages, ...extras.bannerMessages]} />;
}

/*
 * Thin yellow strip above the navbar. From tablet up the messages sit centred in one row,
 * as in Figma; on phones they don't fit, so they scroll by as a looping ticker.
 * The messages come from /admin/settings/content; the starting values hold the space until they've loaded.
 */
export default async function InfoBanner() {
  const [{ banner }, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <aside
      className="w-full overflow-hidden bg-banner py-[11.42px] font-label text-banner-text motion-reduce:overflow-x-auto christmas:bg-orange christmas:text-off-white"
      aria-label={banner.label}
    >
      <Suspense fallback={<Track messages={DEFAULT_SITE_CONTENT[locale].infoBannerMessages} />}>
        <LiveTrack />
      </Suspense>
    </aside>
  );
}
