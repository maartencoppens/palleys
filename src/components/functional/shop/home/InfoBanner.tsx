import { connection } from "next/server";
import { Suspense } from "react";
import { getSiteSettings } from "@/core/modules/settings/service";
import { DEFAULT_SITE_CONTENT } from "@/data/site-content";

function MessageList({ messages, hidden = false }: { messages: string[]; hidden?: boolean }) {
  return (
    <ul
      className={`flex shrink-0 items-center gap-[22px] pr-[22px] md:pr-0 ${hidden ? "md:hidden" : ""}`}
      aria-hidden={hidden || undefined}
    >
      {messages.map((message, index) => (
        <li key={index} className="flex items-center gap-[22px] md:last:[&>span]:hidden">
          <p className="text-[11.1px] leading-[17px] font-bold tracking-[1.22px] whitespace-nowrap uppercase">
            {message}
          </p>
          <span className="text-[16.32px] leading-[25px] font-bold text-banner-dot italic" aria-hidden>
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
    <div className="flex w-max animate-marquee motion-reduce:animate-none md:w-full md:animate-none md:justify-center">
      <MessageList messages={messages} />
      <MessageList messages={messages} hidden />
    </div>
  );
}

async function LiveTrack() {
  await connection();
  const { content } = await getSiteSettings();
  return <Track messages={content.infoBannerMessages} />;
}

/*
 * Thin yellow strip above the navbar. From tablet up the messages sit centred in one row,
 * as in Figma; on phones they don't fit, so they scroll by as a looping ticker.
 * The messages come from /admin/settings/content; the starting values hold the space until they've loaded.
 */
export default function InfoBanner() {
  return (
    <aside
      className="w-full overflow-hidden bg-banner py-[11.42px] font-label text-banner-text motion-reduce:overflow-x-auto"
      aria-label="Waarom Palleys"
    >
      <Suspense fallback={<Track messages={DEFAULT_SITE_CONTENT.infoBannerMessages} />}>
        <LiveTrack />
      </Suspense>
    </aside>
  );
}
