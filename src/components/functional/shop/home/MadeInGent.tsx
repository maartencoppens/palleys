import Image from "next/image";
import { Link } from "@/core/locale/client";
import { getMessages } from "@/core/locale/server";

/* Arrow from the Figma "text-link" component, drawn with currentColor so it follows the link colour. */
function ArrowRight() {
  return (
    <svg
      className="size-[18px] shrink-0 p-[3px] transition-transform group-hover:translate-x-1"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
    >
      <path
        d="M0.75 6H11.25M6 0.75L11.25 6L6 11.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* One line icon per step (photo, colour, check, hand), drawn on a 24px grid with currentColor. */
const stepIcons = [
  <>
    <rect x="3" y="5" width="18" height="15" rx="3" />
    <circle cx="12" cy="12.5" r="3.5" />
    <path d="M8 5l1.5-2h5L16 5" />
  </>,
  <>
    <path d="M12 3c3.5 4.2 6 7.6 6 10.5a6 6 0 0 1-12 0C6 10.6 8.5 7.2 12 3z" />
    <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
  </>,
  <>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <path d="M9.5 12l1.8 1.8L15 10" />
  </>,
  <>
    <path d="M7 12V6.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M10 10.5V4.5a1.5 1.5 0 0 1 3 0v6" />
    <path d="M13 10.5V5.5a1.5 1.5 0 0 1 3 0V12" />
    <path d="M16 11.5V8.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a6.5 6.5 0 0 1-5.2-2.6L3.6 14.8a1.6 1.6 0 0 1 2.4-2.1L7 13.7" />
  </>,
];

/*
 * "Made in Gent" (Figma: made-in-gent, 1440×864): workshop photo next to a green panel, with large
 * rounded corners top-right and bottom-left that reveal the page background of the section above.
 * The card is as tall as its content, not a full screen: from 1024px the photo is a narrower strip (40%) beside the panel,
 * which keeps the panel short; stacked below that, the photo is a strip of at most 340px. Like the other sections it
 * stops at 1440px; on wider screens the page background shows on both sides.
 *
 * The four steps are tiles with an icon (two columns from 640px) rather than a run of paragraphs, so the panel
 * scans at a glance. All text on the green is off-white; the pink from Figma was too faint to read.
 */
export default async function MadeInGent() {
  const { madeInGent: m } = await getMessages();
  return (
    <section
      id="made-in-gent"
      className="mx-auto flex w-full max-w-[1440px] flex-col overflow-hidden rounded-tr-section-lg rounded-bl-section-lg bg-light-yellow lg:flex-row"
      aria-labelledby="made-in-gent-title"
    >
      {/*
       * Stacked (below 1024px) the photo is a wide strip of a portrait shot: it gets a 4:3 height on phones and the
       * crop follows the keychain in the open hand, which sits in the lower half of the photo.
       */}
      <div className="relative min-h-[min(60vw,340px)] flex-1 lg:min-h-0">
        <Image
          className="object-cover object-[55%_74%] lg:object-center"
          src="/images/gent/workshop.jpeg"
          alt={m.photoAlt}
          fill
          sizes="(min-width: 1440px) 706px, (min-width: 1024px) 49vw, 100vw"
        />
      </div>

      <div className="flex shrink-0 flex-col items-start gap-6 bg-medium-green section-x section-y lg:w-[60%] lg:p-[clamp(32px,3.96vw,57px)]">
        <header data-animate="fade-up" className="flex flex-col gap-s">
          <p className="font-label text-xl leading-[19.5px] font-semibold text-accent-highlights md:text-[32px]">
            {m.tag}
          </p>
          <h2
            id="made-in-gent-title"
            className="flex flex-col gap-1 font-display text-[clamp(1.75rem,1rem+2.5vw,3rem)] leading-[1.22] font-medium text-off-white md:gap-s"
          >
            <span>{m.title}</span>
          </h2>
        </header>

        <p
          data-animate="fade-up"
          className="max-w-[620px] text-base leading-[1.6] text-off-white/85 md:text-lg"
        >
          {m.text}
        </p>

        <ul data-animate="stagger" className="grid w-full max-w-[720px] gap-3 sm:grid-cols-2">
          {m.steps.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col gap-2 rounded-2xl bg-off-white/[0.07] p-4 ring-1 ring-off-white/10 md:p-5"
            >
              <span className="grid size-10 place-items-center rounded-full bg-title-accent text-medium-green">
                <svg
                  className="size-[22px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {stepIcons[index]}
                </svg>
              </span>
              <h3 className="font-label text-lg leading-[1.25] font-semibold tracking-[-0.2px] text-off-white">
                {step.title}
              </h3>
              <p className="text-[15px] leading-[1.5] text-off-white/75">{step.text}</p>
            </li>
          ))}
        </ul>

        {/* In Figma this link is green on the green panel (invisible); it uses the title colour here. */}
        <Link
          href="/about"
          className="group mt-2 flex items-center gap-2 font-label md:mt-0 text-[17px] leading-[normal] font-semibold text-off-white transition-colors hover:text-accent-highlights"
        >
          {m.link}
          <ArrowRight />
        </Link>
      </div>
    </section>
  );
}
