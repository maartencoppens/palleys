import Image from "next/image";
import Button from "@/components/design/Button";
import SectionHeader from "@/components/design/SectionHeader";

const benefits = [
  {
    title: "Sprekend jouw huisdier",
    text: "Gemaakt naar je eigen foto, dus onmiskenbaar jouw maatje. Geen twee Palleys zijn hetzelfde.",
  },
  {
    title: "Een cadeau met een verhaal",
    text: "Ken je een baasje dat alles al heeft? Dit hebben ze gegarandeerd nog niet.",
  },
  {
    title: "Elke dag mee",
    text: "Aan je sleutels, je tas of je rugzak: je beste vriend gaat voortaan overal mee.",
  },
];

/*
 * "Why buy a Palley?" (Figma: info-section, 1440×1246). Same page background as the sections around it,
 * so it continues straight from the rounded corner of "Made in Gent".
 *
 * The photo is Figma's own export of the blob-shaped mask (2× for sharp screens). On desktop its width is
 * also capped by the viewport height, so the whole section still fits one screen on shorter monitors:
 * 601px is the height of everything else in the section on desktop, 2.098 the photo's aspect ratio.
 */
export default function WhyPalleys() {
  return (
    <section
      id="why-palleys"
      className="flex min-h-svh flex-col items-center justify-center stack bg-page section-x section-y lg:gap-[47px] lg:px-m lg:py-[70px]"
      aria-labelledby="why-palleys-title"
    >
      <div className="flex w-full flex-col items-center gap-6 md:gap-[55px]">
        <SectionHeader
          tag="Waarom een Palley?"
          title="Je Palley, altijd bij je"
          titleId="why-palleys-title"
        />

        <Image
          data-animate="pop"
          className="h-auto w-full max-w-[1266px] lg:w-[min(100%,max(560px,calc((100svh-601px)*2.098)))]"
          src="/images/info/pets-together.png"
          width={1266}
          height={603.5}
          alt="Een golden retriever, een pluizige puppy en een rosse kat liggen samen in het gras"
          sizes="(min-width: 1298px) 1266px, 100vw"
        />
      </div>

      <ul
        data-animate="stagger"
        className="grid w-full max-w-[1260px] gap-4 md:grid-cols-3 md:gap-8 lg:gap-[117px]"
      >
        {benefits.map((benefit) => (
          <li
            key={benefit.title}
            className="flex flex-col gap-1 text-medium-green md:gap-[13px]"
          >
            <h3 className="font-display text-2xl leading-[1.2] font-bold md:text-[26px] lg:text-[32px]">
              {benefit.title}
            </h3>
            <p className="text-base leading-[1.36] md:text-xl lg:text-2xl">
              {benefit.text}
            </p>
          </li>
        ))}
      </ul>

      <div data-animate="fade-up">
        <Button href="/create" size="large">
          Maak je Palley
        </Button>
      </div>
    </section>
  );
}
