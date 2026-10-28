import Image from "next/image";
import SectionHeader from "@/components/design/SectionHeader";

type Member = {
  name: string;
  role: string;
  petName: string;
  /** Portrait in /public; until there is one, a coloured avatar with a person icon is shown. */
  photo?: string;
};

// TODO: fill in the real names, pets and portraits. Figma only has placeholders for these.
const members: Member[] = [
  { name: "Joran Vreye", role: "Founder & CEO", petName: "Baloe" },
  { name: "Emie Van de Veire", role: "Finance", petName: "[pet name]" },
  {
    name: "Maarten Coppens",
    role: "Marketing & social media",
    petName: "Zorro",
  },
  {
    name: "Reinhart Schepens",
    role: "Design & 3D-modellering",
    petName: "[pet name]",
  },
  {
    name: "Bavo de Bondt",
    role: "Productie & printen",
    petName: "[pet name]",
  },
  {
    name: "Lies De Praeter",
    role: "Sales & klantenservice",
    petName: "[pet name]",
  },
];

// Avatar colours repeat in the Figma order.
const avatarColours = [
  "bg-coral",
  "bg-accent-highlights",
  "bg-teal",
  "bg-medium-green",
];

/* "Meet the humans behind the pals" (Figma: team): six member cards, 3 per row from 1024px, 2 on tablets. */
export default function Team() {
  return (
    <section
      aria-labelledby="team-title"
      className="mx-auto flex max-w-[1440px] flex-col items-center stack section-x section-y"
    >
      <SectionHeader
        tag="Het team"
        title="De mensen achter de pals"
        titleId="team-title"
      />

      <ul
        data-animate="stagger"
        className="grid w-full gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-8"
      >
        {members.map((member, index) => (
          <li
            key={member.role}
            className="flex flex-col items-center gap-3 rounded-[32px] bg-white p-6 text-center md:p-8"
          >
            <div
              className={`relative grid size-32 place-items-center overflow-hidden rounded-full md:size-40 ${avatarColours[index % avatarColours.length]}`}
            >
              {member.photo ? (
                <Image
                  className="object-cover"
                  src={member.photo}
                  alt=""
                  fill
                  sizes="160px"
                />
              ) : (
                <Image
                  className="w-[36%]"
                  src="/images/about/user.svg"
                  width={52.5}
                  height={58.5}
                  alt=""
                  aria-hidden
                />
              )}
            </div>
            <h3 className="font-display text-2xl leading-[1.2] font-medium text-medium-green">
              {member.name}
            </h3>
            <p className="font-label text-base font-bold text-orange">
              {member.role}
            </p>
            <p className="flex items-center gap-2 rounded-full bg-off-white px-3.5 py-2 text-sm leading-[1.5] text-text-primary">
              <Image
                src="/images/about/paw-green.svg"
                width={14.6626}
                height={14.6659}
                alt=""
                aria-hidden
              />
              Trots baasje van {member.petName}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
