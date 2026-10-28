import Image from "next/image";
import SectionHeader from "@/components/design/SectionHeader";

const steps = [
  {
    title: "Jouw foto",
    text: "Je uploadt een scherpe foto van je huisdier.",
    badge: "bg-medium-green",
    icon: { src: "/images/about/camera.svg", width: 47.6667, height: 39 },
  },
  {
    title: "3D-model",
    text: "Ons team boetseert een 3D-model, tot op elk vlekje en snorhaar.",
    badge: "bg-coral",
    icon: { src: "/images/about/cube.svg", width: 43.3333, height: 47.8356 },
  },
  {
    title: "Print in kleur",
    text: "We printen het in resin en werken het met de hand af.",
    badge: "bg-accent-highlights",
    icon: { src: "/images/about/printer.svg", width: 47.6667, height: 47.6667 },
  },
  {
    title: "In je bus",
    text: "Met liefde ingepakt en verstuurd naar je brievenbus.",
    badge: "bg-teal",
    icon: { src: "/images/about/box.svg", width: 43.3333, height: 47.6622 },
  },
];

/* "How a Palley is made" (Figma: how-its-made): four numbered steps on white. 2×2 below 1024px. */
export default function MadeSteps() {
  return (
    <section aria-labelledby="made-title" className="bg-white">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center stack section-x section-y">
        <SectionHeader
          tag="Van foto tot pal"
          title="Zo ontstaat een Palley"
          titleId="made-title"
        />

        <ol
          data-animate="stagger"
          className="grid w-full grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4 lg:gap-8"
        >
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col items-center gap-3 text-center md:gap-4"
            >
              <span
                data-animate="wiggle"
                className={`grid size-20 place-items-center rounded-full md:size-28 ${step.badge}`}
                aria-hidden
              >
                <Image
                  className="w-[65%] md:w-auto"
                  src={step.icon.src}
                  width={step.icon.width}
                  height={step.icon.height}
                  alt=""
                />
              </span>
              <h3 className="font-display text-xl leading-[1.2] font-medium text-medium-green md:text-2xl">
                {index + 1}. {step.title}
              </h3>
              <p className="text-base leading-[1.5] text-text-primary md:text-lg">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
