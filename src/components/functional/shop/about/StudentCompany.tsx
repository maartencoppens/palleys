import Image from "next/image";
import { getMessages } from "@/core/locale/server";

const FACT_ICONS = {
  factGhent: { src: "/images/about/pin-orange.svg", width: 13.5, height: 16.4998 },
  factSchool: { src: "/images/about/cap-orange.svg", width: 16.5, height: 12.1875 },
  factCharity: { src: "/images/about/heart-orange.svg", width: 16.5, height: 15 },
} as const;
const FACTS = ["factGhent", "factSchool", "factCharity"] as const;

/* "A real student company" (Figma: student-company): yellow card with a graduation-cap badge and fact pills. */
export default async function StudentCompany() {
  const { about } = await getMessages();
  const m = about.student;
  return (
    <section
      aria-labelledby="student-title"
      className="mx-auto max-w-[1440px] section-x section-pt"
    >
      <div data-animate="pop" className="flex flex-col items-start gap-6 rounded-[32px] bg-light-yellow px-6 py-8 md:flex-row md:items-center md:gap-10 md:rounded-[40px] md:px-12 md:py-12 lg:gap-14 lg:px-16 lg:py-14">
        <span className="grid size-24 shrink-0 place-items-center rounded-full bg-orange md:size-[140px]" aria-hidden>
          <Image className="w-[60%] md:w-auto" src="/images/about/cap.svg" width={58.6667} height={43.3333} alt="" />
        </span>

        <div className="flex flex-col gap-4">
          <p className="font-label text-lg font-bold text-orange">{m.tag}</p>
          <h2
            id="student-title"
            className="font-display text-[26px] leading-[1.2] font-bold text-medium-green md:text-[32px]"
          >
            {m.title}
          </h2>
          <p className="text-lg leading-[1.5] text-text-primary md:text-xl">
            {m.text}
          </p>
          <ul className="flex flex-wrap gap-3 md:gap-4">
            {FACTS.map((fact) => (
              <li
                key={fact}
                className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 font-label text-base font-semibold text-text-primary"
              >
                <span className="grid size-[18px] place-items-center" aria-hidden>
                  <Image src={FACT_ICONS[fact].src} width={FACT_ICONS[fact].width} height={FACT_ICONS[fact].height} alt="" />
                </span>
                {m[fact]}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
