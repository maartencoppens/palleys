import type { CSSProperties } from "react";
import Image from "next/image";
import { Link } from "@/core/locale/client";
import { getMessages } from "@/core/locale/server";
import Seasonal from "@/components/functional/seasonal/Seasonal";

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

/*
 * One line icon per step, the same artwork as public/images/about/{camera,printer,user,box}.svg but drawn with
 * currentColor so it can be green on the light blobs. Each keeps its own viewBox.
 */
const stepIcons = [
  {
    viewBox: "0 0 47.7 39",
    paths: [
      "M29.2 2.2H18.4L13 8.7H6.5C5.4 8.7 4.2 9.1 3.4 9.9C2.6 10.7 2.2 11.9 2.2 13V32.5C2.2 33.6 2.6 34.8 3.4 35.6C4.2 36.4 5.4 36.8 6.5 36.8H41.2C42.3 36.8 43.4 36.4 44.2 35.6C45 34.8 45.5 33.6 45.5 32.5V13C45.5 11.9 45 10.7 44.2 9.9C43.4 9.1 42.3 8.7 41.2 8.7H34.7L29.2 2.2Z",
      "M23.8 28.2C27.4 28.2 30.3 25.3 30.3 21.7C30.3 18.1 27.4 15.2 23.8 15.2C20.2 15.2 17.3 18.1 17.3 21.7C17.3 25.3 20.2 28.2 23.8 28.2Z",
    ],
  },
  {
    viewBox: "0 0 47.7 47.7",
    paths: [
      "M10.8 17.3V2.2H36.8V17.3",
      "M10.8 36.8H6.5C5.4 36.8 4.2 36.4 3.4 35.6C2.6 34.8 2.2 33.6 2.2 32.5V21.7C2.2 20.5 2.6 19.4 3.4 18.6C4.2 17.8 5.4 17.3 6.5 17.3H41.2C42.3 17.3 43.4 17.8 44.2 18.6C45 19.4 45.5 20.5 45.5 21.7V32.5C45.5 33.6 45 34.8 44.2 35.6C43.4 36.4 42.3 36.8 41.2 36.8H36.8",
      "M36.8 28.2H10.8V45.5H36.8V28.2Z",
    ],
  },
  {
    viewBox: "0 0 52.5 58.5",
    paths: [
      "M26.2 32.2C34.5 32.2 41.2 25.5 41.2 17.2C41.2 9 34.5 2.2 26.2 2.2C18 2.2 11.2 9 11.2 17.2C11.2 25.5 18 32.2 26.2 32.2Z",
      "M50.2 56.2C50.2 49.9 47.7 43.8 43.2 39.3C38.7 34.8 32.6 32.2 26.2 32.2C19.9 32.2 13.8 34.8 9.3 39.3C4.8 43.8 2.2 49.9 2.2 56.2",
    ],
  },
  {
    viewBox: "0 0 43.3 47.7",
    paths: [
      "M41.2 15.2C41.2 14.4 41 13.7 40.6 13C40.2 12.3 39.7 11.8 39 11.4L23.8 2.7C23.2 2.4 22.4 2.2 21.7 2.2C20.9 2.2 20.2 2.4 19.5 2.7L4.3 11.4C3.7 11.8 3.1 12.3 2.7 13C2.4 13.7 2.2 14.4 2.2 15.2V32.5C2.2 33.3 2.4 34 2.7 34.7C3.1 35.3 3.7 35.9 4.3 36.2L19.5 44.9C20.2 45.3 20.9 45.5 21.7 45.5C22.4 45.5 23.2 45.3 23.8 44.9L39 36.2C39.7 35.9 40.2 35.3 40.6 34.7C41 34 41.2 33.3 41.2 32.5V15.2Z",
      "M2.8 13L21.7 23.8L40.5 13",
      "M21.7 45.5V23.8",
    ],
  },
];

/*
 * Every station gets its own blob shape, colour and tilt, so the route reads as a hand-made path rather than a grid
 * of identical tiles. The colours are the HowItWorks blobs (the blue is the fill of steps/blob-3.svg).
 */
const stations = [
  { blob: "mask-blob-1", colour: "bg-light-yellow", tilt: "-rotate-6", badge: "mask-blob-2" },
  { blob: "mask-blob-2", colour: "bg-pink", tilt: "rotate-[8deg]", badge: "mask-blob-3" },
  { blob: "mask-blob-3", colour: "bg-[#b3d1d7]", tilt: "-rotate-[10deg]", badge: "mask-blob-1" },
  { blob: "mask-blob-1", colour: "bg-light-green", tilt: "rotate-[4deg]", badge: "mask-blob-2" },
];

/* The pad and toes of the paw in the logo; toes point up, so it's rotated to the walking direction. */
function Paw({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="-16 -17 32 39" fill="currentColor" aria-hidden>
      <path d="M0 4C-9 4 -13 11 -12 16C-11 21 -5 21 0 19C5 21 11 21 12 16C13 11 9 4 0 4Z" />
      <ellipse cx="-11" cy="-4" rx="3.6" ry="4.8" transform="rotate(-20 -11 -4)" />
      <ellipse cx="-4" cy="-10" rx="3.8" ry="5.2" transform="rotate(-6 -4 -10)" />
      <ellipse cx="4" cy="-10" rx="3.8" ry="5.2" transform="rotate(6 4 -10)" />
      <ellipse cx="11" cy="-4" rx="3.6" ry="4.8" transform="rotate(20 11 -4)" />
    </svg>
  );
}

/*
 * Three paw prints from the bottom of this station's blob to the top of the next one, walking down towards the next
 * step. The next blob sits --route-shift to the right (or back to the left), so the trail is that wide and mirrored
 * when it heads left. It runs to the next item's top edge, however tall this item's text is.
 */
function PawTrail({ towardsLeft }: { towardsLeft: boolean }) {
  const prints = [
    { left: "15%", top: "14%", side: -1 },
    { left: "50%", top: "50%", side: 1 },
    { left: "85%", top: "86%", side: -1 },
  ];
  return (
    <span
      className={`pointer-events-none absolute top-[calc(var(--route-blob)+6px)] -bottom-10 w-(--route-shift) ${
        towardsLeft ? "left-[calc(var(--route-blob)/2-var(--route-shift))] -scale-x-100" : "left-[calc(var(--route-blob)/2)]"
      }`}
      aria-hidden
    >
      {prints.map((print) => (
        <Paw
          key={print.top}
          className="absolute size-[18px] text-light-green/85 md:size-5"
          style={{
            left: print.left,
            top: print.top,
            transform: `translate(-50%, -50%) translateX(${print.side * 7}px) rotate(150deg)`,
          }}
        />
      ))}
    </span>
  );
}

/*
 * "Made in Gent": one green block with the workshop photo in a brand blob beside the text, with large rounded corners
 * top-right and bottom-left that reveal the page background of the section above. Like the other sections it stops
 * at 1440px.
 *
 * The four steps are a route from photo to keychain: tilted blob stations with a line icon and a number sticker,
 * shifted left and right, connected by a trail of paw prints. That shows the order of the steps, which the earlier
 * grid of identical tiles didn't, and keeps the brand blob and paw instead of generic cards with icon circles.
 */
export default async function MadeInGent() {
  const { madeInGent: m } = await getMessages();
  return (
    <section
      id="made-in-gent"
      className="relative mx-auto flex w-full max-w-[1440px] flex-col overflow-hidden rounded-tr-section-lg rounded-bl-section-lg bg-medium-green lg:flex-row"
      aria-labelledby="made-in-gent-title"
    >
      <Seasonal slot="madeInGentDecor" />
      {/*
       * The photo is a blob on the green. Stacked (below 1024px) it's a 4:3 shot whose crop follows the keychain in
       * the open hand, which sits in the lower half of the photo; beside the panel it's taller.
       */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-10 lg:p-[clamp(24px,3vw,48px)]">
        <div className="relative aspect-[4/3] w-full max-w-[560px] mask-blob-2 lg:aspect-[4/5]">
          <Image
            className="object-cover object-[55%_74%] lg:object-center"
            src="/images/gent/workshop.jpeg"
            alt={m.photoAlt}
            fill
            sizes="(min-width: 1440px) 560px, (min-width: 1024px) 40vw, 100vw"
          />
        </div>
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

        <ol
          data-animate="stagger"
          className="mt-2 flex w-full max-w-[640px] flex-col gap-12 [--route-blob:84px] [--route-shift:36px] md:[--route-blob:104px] md:[--route-shift:96px]"
        >
          {m.steps.map((step, index) => {
            const station = stations[index % stations.length];
            const icon = stepIcons[index % stepIcons.length];
            const shifted = index % 2 === 1;
            return (
              <li key={step.title} className={`relative flex items-start gap-4 md:gap-6 ${shifted ? "ml-(--route-shift)" : ""}`}>
                <span className="relative grid size-(--route-blob) shrink-0 place-items-center text-medium-green" aria-hidden>
                  <span className={`absolute inset-0 ${station.blob} ${station.colour} ${station.tilt}`} />
                  <svg
                    className="relative size-[40%]"
                    viewBox={icon.viewBox}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {icon.paths.map((d) => (
                      <path key={d} d={d} />
                    ))}
                  </svg>
                  <span
                    className={`absolute -top-2 -left-2 grid size-8 place-items-center bg-title-accent font-display text-base font-bold text-medium-green md:size-9 md:text-lg ${station.badge}`}
                  >
                    {index + 1}
                  </span>
                </span>
                <div className="flex flex-col gap-1.5 pt-1 md:pt-3">
                  <h3 className="font-label text-lg leading-[1.25] font-semibold tracking-[-0.2px] text-off-white md:text-xl">
                    <span className="sr-only">{index + 1}. </span>
                    {step.title}
                  </h3>
                  <p className="text-[15px] leading-[1.5] text-off-white/80 md:text-base">{step.text}</p>
                </div>
                {index < m.steps.length - 1 && <PawTrail towardsLeft={shifted} />}
              </li>
            );
          })}
        </ol>

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
