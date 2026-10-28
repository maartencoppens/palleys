import Button from "@/components/design/Button";
import SectionHeader from "@/components/design/SectionHeader";
import StepCard, { type Step } from "@/components/design/StepCard";

const steps: Step[] = [
  {
    title: "Kies je huisdier",
    description: "Hond, kat, konijn of egel: vertel ons wie een Palley wordt.",
    blob: { src: "/images/steps/blob-1.svg", width: 273, height: 267 },
    icon: {
      src: "/images/steps/icon-paw.svg",
      width: 132.571,
      height: 131.69,
      x: 68.2,
      y: 70.4,
    },
  },
  {
    title: "Upload een foto",
    description:
      "Eén heldere, scherpe foto is genoeg. Wij modelleren, printen en werken de rest met de hand af.",
    blob: { src: "/images/steps/blob-2.svg", width: 273.261, height: 247.171 },
    icon: {
      src: "/images/steps/icon-camera.svg",
      width: 138,
      height: 118,
      x: 65.5,
      y: 65,
    },
  },
  {
    title: "Ontmoet je Palley",
    description:
      "Binnen 2–3 weken valt je Palley in de bus, klaar voor je sleutelbos.",
    blob: { src: "/images/steps/blob-3.svg", width: 271.825, height: 243.684 },
    icon: {
      src: "/images/steps/icon-gift.svg",
      width: 105.5,
      height: 105.497,
      x: 83.5,
      y: 71,
    },
  },
];

/*
 * "How it works" (Figma: pet-categores-section, 1440×1040). It shares the page background with the
 * hero's rounded bottom-left corner, so the hero flows straight into it without a seam.
 * Desktop: three 447px cards 22px apart, the middle one 92px lower. Tablet keeps the three columns with
 * smaller artwork; phones get compact rows, so the section still fits one screen.
 */
export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="flex min-h-svh flex-col items-center justify-center stack bg-page section-x section-y lg:gap-20 lg:px-m lg:py-28"
      aria-labelledby="how-it-works-title"
    >
      <SectionHeader
        tag="Zo werkt het"
        title="Van foto tot Palley in drie stappen."
        titleId="how-it-works-title"
      />

      <ol
        data-animate="stagger"
        className="grid w-full max-w-[1385px] justify-items-center gap-6 md:grid-cols-3 md:items-start md:gap-[22px]"
      >
        {steps.map((step, index) => (
          <StepCard
            key={step.title}
            number={index + 1}
            {...step}
            className={
              index === 1
                ? "md:mt-[69px] lg:mt-[92px] lg:[&_p]:max-w-[313px]"
                : ""
            }
          />
        ))}
      </ol>

      <div data-animate="fade-up">
        <Button href="/create" size="large">
          Maak je Palley
        </Button>
      </div>
    </section>
  );
}
