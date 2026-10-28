import Image from "next/image";
import type { RefObject } from "react";
import type { StepStatus } from "@/data/options";

type PanelProps = {
  id: string;
  number: number;
  title: string;
  status: StepStatus;
  /** Marks the step right after the one being worked on with "Next". */
  isNext?: boolean;
  /** Lets the configurator move focus to this panel's heading (e.g. when something is missing). */
  headingRef?: RefObject<HTMLHeadingElement | null>;
  children: React.ReactNode;
};

const badgeClassName: Record<StepStatus, string> = {
  done: "bg-medium-green",
  active: "bg-coral",
  upcoming: "bg-accent-highlights",
};

/*
 * Figma: panel/… – white card with a numbered badge and title. The step being worked on gets a coral
 * border and badge, finished steps a green badge and "Done" pill, later steps a yellow badge; the one
 * right after the current step also says "Next".
 */
export default function Panel({
  id,
  number,
  title,
  status,
  isNext = false,
  headingRef,
  children,
}: PanelProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`flex scroll-mt-28 flex-col gap-6 rounded-3xl bg-white p-5 transition-shadow md:scroll-mt-32 md:gap-7 md:rounded-[32px] md:p-10 ${status === "active" ? "ring-3 ring-coral ring-inset" : ""}`}
    >
      <header className="flex items-center gap-3 md:gap-4">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-full font-display text-lg font-bold text-off-white md:size-12 md:text-[22px] ${badgeClassName[status]}`}
          aria-hidden
        >
          {number}
        </span>
        <h2
          id={`${id}-title`}
          ref={headingRef}
          tabIndex={-1}
          className="flex-1 font-display text-2xl leading-[1.2] font-bold text-medium-green outline-none md:text-[32px]"
        >
          {title}
        </h2>
        {status === "done" && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-light-green px-3.5 py-1.5 font-label text-base font-bold text-medium-green">
            <Image
              src="/images/create/check-green.svg"
              width={12.6667}
              height={9.33333}
              alt=""
              aria-hidden
            />
            Klaar
          </span>
        )}
        {isNext && status === "upcoming" && (
          <span className="shrink-0 font-label text-base font-bold text-orange">
            Volgende
          </span>
        )}
      </header>
      {children}
    </section>
  );
}
