import Image from "next/image";

const tips = [
  {
    title: "Goed licht",
    text: "Daglicht werkt het best, zonder flits.",
    icon: { src: "/images/create/sun.svg", width: 18.3333, height: 18.3333 },
    badge: "bg-accent-highlights",
  },
  {
    title: "Helemaal in beeld",
    text: "Van kop tot staart, op ooghoogte.",
    icon: { src: "/images/create/camera.svg", width: 18.3333, height: 15 },
    badge: "bg-teal",
  },
  {
    title: "Eén dier per foto",
    text: "Enkel het huisdier dat je als Palley wilt.",
    icon: { src: "/images/create/paw.svg", width: 18.3282, height: 18.3324 },
    badge: "bg-coral",
  },
];

/* Figma: photo-tips. */
export default function PhotoTips() {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-label text-lg font-semibold text-text-primary md:text-xl">Tips voor de perfecte foto</h3>
      <ul className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {tips.map((tip) => (
          <li key={tip.title} className="flex gap-4 rounded-[20px] bg-off-white p-4 sm:flex-col sm:gap-2.5 sm:p-5">
            <span className={`grid size-11 shrink-0 place-items-center rounded-full ${tip.badge}`} aria-hidden>
              <Image src={tip.icon.src} width={tip.icon.width} height={tip.icon.height} alt="" />
            </span>
            <div className="flex flex-col gap-1 sm:gap-2.5">
              <p className="font-label text-lg font-semibold text-text-primary">{tip.title}</p>
              <p className="text-base leading-[1.5] text-text-primary">{tip.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
