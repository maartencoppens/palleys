import Image from "next/image";
import { steps, type StepId, type StepStatus } from "@/data/options";

const circleClassName: Record<StepStatus, string> = {
  done: "bg-medium-green",
  active: "bg-coral text-off-white",
  upcoming: "border-2 border-accent-highlights bg-white text-text-primary",
};

const statusText: Record<StepStatus, string> = {
  done: "voltooid",
  active: "huidige stap",
  upcoming: "nog niet gestart",
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
  return (
    <nav aria-label="Voortgang van je bestelling">
      <ol className="flex items-center gap-3 md:gap-4">
        {steps.map((step, index) => {
          const stepStatus = status[step.id];
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step.id}
              className={`flex items-center gap-3 md:gap-4 ${isLast ? "" : "flex-1"}`}
            >
              <a
                href={`#${step.id}`}
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
                  {step.label}
                </span>
                <span className="sr-only">
                  {`Stap ${index + 1}: ${step.label}, ${statusText[stepStatus]}`}
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
