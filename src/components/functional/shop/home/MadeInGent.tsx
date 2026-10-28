import Image from "next/image";
import Link from "next/link";

const craftSteps = [
  {
    title: "Geboetseerd naar jouw foto",
    description: "Vlekjes, kleuren en dat ene flaporetje: we modelleren jouw huisdier, geen standaardras.",
  },
  {
    title: "In volle kleur geprint",
    description: "Onze resinprinter legt elk detail en elke kleur in één keer vast. Geen verf die afbladdert.",
  },
  {
    title: "Gecheckt door een mens",
    description: "Elke Palley wordt met de hand afgewerkt en nagekeken voor hij ons atelier verlaat.",
  },
];

/* Arrow from the Figma "text-link" component, drawn with currentColor so it follows the link colour. */
function ArrowRight() {
  return (
    <svg className="size-[18px] shrink-0 p-[3px] transition-transform group-hover:translate-x-1" viewBox="0 0 12 12" fill="none" aria-hidden>
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
 * "Made in Gent" (Figma: made-in-gent, 1440×864): workshop photo next to a green panel, with large
 * rounded corners top-right and bottom-left that reveal the page background of the section above.
 * From 1024px the photo and panel sit side by side (panel 734px of 1440). Below that they stack and the
 * photo fills whatever height the panel leaves; on phones the panel keeps roomy spacing, so the section
 * can run slightly taller than one screen there.
 */
export default function MadeInGent() {
  return (
    <section
      id="made-in-gent"
      className="flex min-h-svh flex-col overflow-hidden rounded-tr-section-lg rounded-bl-section-lg bg-light-yellow lg:flex-row"
      aria-labelledby="made-in-gent-title"
    >
      <div className="relative min-h-[200px] flex-1">
        <Image
          className="object-cover"
          src="/images/gent/workshop.jpg"
          alt="Een maker in het Palleys-atelier in Gent schildert een 3D-geprinte corgi, met een resinprinter op de achtergrond"
          fill
          sizes="(min-width: 1024px) 49vw, 100vw"
        />
      </div>

      <div className="flex shrink-0 flex-col items-start gap-6 bg-medium-green section-x section-y lg:w-[51%] lg:p-[clamp(32px,3.96vw,57px)]">
        <header data-animate="fade-up" className="flex flex-col gap-s">
          <p className="font-label text-xl leading-[19.5px] font-semibold text-accent-highlights md:text-[32px]">
            Made in Gent
          </p>
          <h2
            id="made-in-gent-title"
            className="flex flex-col gap-1 font-display text-[clamp(1.75rem,1rem+2.5vw,3rem)] leading-[1.22] font-medium text-off-white md:gap-s"
          >
            <span>Gemodelleerd, geprint</span>
            <span>En met de hand afgewerkt</span>
          </h2>
        </header>

        <p data-animate="fade-up" className="max-w-[620px] text-base leading-[1.6] text-pink md:text-lg">
          Elke Palley begint als foto en eindigt aan iemands sleutelbos. Alles daartussen doet ons team in Gent
          zelf.
        </p>

        <ul data-animate="stagger" className="w-full max-w-[620px] text-pink">
          {craftSteps.map((step) => (
            <li key={step.title} className="flex flex-col gap-1.5 border-t border-pink py-4 md:py-5">
              <h3 className="font-label text-lg leading-[1.25] font-semibold tracking-[-0.2px] md:text-xl">{step.title}</h3>
              <p className="text-base leading-[1.6]">{step.description}</p>
            </li>
          ))}
        </ul>

        {/* In Figma this link is green on the green panel (invisible); it uses the title colour here. */}
        <Link
          href="/about"
          className="group mt-2 flex items-center gap-2 font-label md:mt-0 text-[17px] leading-[normal] font-semibold text-off-white transition-colors hover:text-accent-highlights"
        >
          Lees ons verhaal
          <ArrowRight />
        </Link>
      </div>
    </section>
  );
}
