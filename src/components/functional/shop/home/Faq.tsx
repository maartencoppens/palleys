import SectionHeader from "@/components/design/SectionHeader";

/*
 * Figma only gives the answer to the first question; the others are drafts based on copy elsewhere
 * on the page. Have them checked before going live (especially delivery times, which aren't stated).
 */
const faqs = [
  {
    question: "Hoe werkt een Palley op maat?",
    answer:
      "Je kiest je huisdier en uploadt een foto. Wij doen de rest: we modelleren je huisdier in 3D, printen het in volle kleur en werken het met de hand af. Elke Palley is uniek.",
  },
  {
    question: "Welke foto upload ik best?",
    answer:
      "Kies een heldere, scherpe foto waarop het snuitje en de tekening van je huisdier goed te zien zijn. Hoe beter we ze zien, hoe meer je Palley op je huisdier lijkt.",
  },
  {
    question: "Kan ik een Palley cadeau geven?",
    answer:
      "Zeker weten. Een Palley is een heel persoonlijk cadeau voor een ander baasje, een vriend of jezelf. Upload gewoon een foto van hun huisdier.",
  },
  {
    question: "Hoelang duurt mijn bestelling?",
    answer:
      "Elke Palley wordt met de hand gemodelleerd, geprint en afgewerkt in ons atelier in Gent. Reken op 2 tot 3 weken tot hij in je bus valt.",
  },
  {
    question: "Welk goed doel steunt Palleys?",
    answer:
      "We geven 50% van onze winst aan WWF, voor de bescherming van dieren en hun leefgebied.",
  },
];

/*
 * "Frequently asked questions" (Figma: faq-section, 1440×959). Same page background as the cream
 * corner of the charity section above, so it flows on without a seam.
 *
 * Built on <details>/<summary>: keyboard and screen-reader friendly without JavaScript. The shared
 * `name` makes it an exclusive accordion (opening one question closes the other), and the first one
 * starts open as in Figma.
 *
 * Spacing differs from Figma on purpose: each question gets even padding above and below (Figma pads
 * only the top, leaving the row top-heavy), the +/− lines up with the question, and the answer sits
 * closer to its question than to the next one.
 */
export default function Faq() {
  return (
    <section
      id="faq"
      className="flex min-h-svh flex-col items-center justify-center stack bg-page section-x section-y"
      aria-labelledby="faq-title"
    >
      <SectionHeader
        tag="Even helpen"
        title="Veelgestelde vragen"
        subtitle="Dingen die je je misschien afvraagt"
        titleId="faq-title"
      />

      <div
        data-animate="stagger"
        className="w-full max-w-[837px] border-b border-medium-green"
      >
        {faqs.map((faq, index) => (
          <details
            key={faq.question}
            name="faq"
            open={index === 0}
            className="group border-t border-medium-green"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-medium-green md:py-6 [&::-webkit-details-marker]:hidden">
              <h3 className="font-display text-xl leading-[1.25] font-bold md:text-[26px] lg:text-[32px]">
                {faq.question}
              </h3>
              {/* Plus that turns into a minus when open; the vertical bar folds away. */}
              <span className="relative size-4 shrink-0 md:size-5" aria-hidden>
                <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-current" />
                <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-current transition-transform duration-200 group-open:scale-y-0" />
              </span>
            </summary>
            <p className="pb-6 text-base leading-[1.5] text-medium-green md:-mt-1 md:pb-7 md:text-xl lg:text-2xl">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
