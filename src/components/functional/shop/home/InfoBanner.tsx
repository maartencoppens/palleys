const messages = ["A pal for your keys", "Gemaakt van jouw foto", "Met de hand afgewerkt in Gent", "Keys deserve a pal too"];

function MessageList({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul
      className={`flex shrink-0 items-center gap-[22px] pr-[22px] md:pr-0 ${hidden ? "md:hidden" : ""}`}
      aria-hidden={hidden || undefined}
    >
      {messages.map((message) => (
        <li key={message} className="flex items-center gap-[22px] md:last:[&>span]:hidden">
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

/*
 * Thin yellow strip above the navbar. From tablet up the messages sit centred in one row,
 * as in Figma; on phones they don't fit, so they scroll by as a looping ticker.
 */
export default function InfoBanner() {
  return (
    <aside
      className="w-full overflow-hidden bg-banner py-[11.42px] font-label text-banner-text motion-reduce:overflow-x-auto"
      aria-label="Waarom Palleys"
    >
      {/* Two identical lists; the track moves left by exactly one list's width, then repeats. */}
      <div className="flex w-max animate-marquee motion-reduce:animate-none md:w-full md:animate-none md:justify-center">
        <MessageList />
        <MessageList hidden />
      </div>
    </aside>
  );
}
