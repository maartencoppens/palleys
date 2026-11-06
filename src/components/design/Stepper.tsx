import Image from "next/image";
import { useMessages } from "@/core/locale/client";
import { fill } from "@/core/locale/fill";
import { STEP_IDS, type StepId, type StepStatus } from "@/data/options";

const circleClassName: Record<StepStatus, string> = {
  done: "bg-medium-green",
  active: "bg-coral text-off-white",
  upcoming: "border-2 border-accent-highlights bg-white text-text-primary",
};

/*
 * Figma: stepper. Each step links to its panel; the line after a finished step turns green. Unfinished
 * lines use a faint green, because Figma's light grey matches the cream page background.
 */
export default function Stepper({
  status,
}: {
  status: Record<StepId, StepStatus>;
}) {
  const { create } = useMessages();
  return (
    <nav aria-label={create.stepper.label}>
      <ol className="flex items-center gap-3 md:gap-4">
        {STEP_IDS.map((step, index) => {
          const stepStatus = status[step];
          const isLast = index === STEP_IDS.length - 1;
          const label = create.steps[step];

          return (
            <li
              key={step}
              className={`flex items-center gap-3 md:gap-4 ${isLast ? "" : "flex-1"}`}
            >
              <a
                href={`#${step}`}
                className="flex shrink-0 items-center gap-3 rounded-full"
                aria-current={stepStatus === "active" ? "step" : undefined}
              >
                <span
                  className={`grid size-10 place-items-center rounded-full font-display text-xl font-bold md:size-[52px] md:text-2xl ${circleClassName[stepStatus]}`}
                  aria-hidden
                >
                  {stepStatus === "done" ? (
                    <Image
                      src="/images/create/check.svg"
                      width={19}
                      height={14}
                      alt=""
                    />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={`hidden font-display text-xl font-medium sm:inline md:text-2xl ${stepStatus === "upcoming" ? "text-text-primary" : "text-medium-green"}`}
                >
                  {label}
                </span>
                <span className="sr-only">
                  {fill(create.stepper.step, { number: index + 1, label, status: create.stepper[stepStatus] })}
                </span>
              </a>
              {!isLast && (
                <span
                  className={`h-1 flex-1 rounded-sm transition-colors ${stepStatus === "done" ? "bg-medium-green" : "bg-medium-green/15"}`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
