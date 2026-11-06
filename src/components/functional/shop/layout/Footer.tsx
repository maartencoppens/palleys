import Image from "next/image";
import { connection } from "next/server";
import { Suspense } from "react";
import CtaCard from "@/components/design/CtaCard";
import { Link } from "@/core/locale/client";
import { fill } from "@/core/locale/fill";
import { getMessages } from "@/core/locale/server";
import { getSiteSettings } from "@/core/modules/settings/service";
import { PRIVACY_URL, TERMS_URL } from "@/data/checkout";
import { SOCIAL_LINKS } from "@/data/company";

const socialIcons = [
  { key: "instagram", label: "Instagram", icon: "/images/footer/instagram.svg", size: 56 },
  { key: "tiktok", label: "TikTok", icon: "/images/footer/tiktok.svg", size: 50 },
  { key: "facebook", label: "Facebook", icon: "/images/footer/facebook.svg", size: 56 },
] as const;

/* The profile URLs come from /admin/settings/company; an empty one hides its icon. */
function Socials({ urls, label }: { urls: Record<(typeof socialIcons)[number]["key"], string>; label: string }) {
  return (
    <ul className="flex items-center gap-[38px]">
      {socialIcons
        .filter((social) => urls[social.key])
        .map((social) => (
          <li key={social.key}>
            <a
              href={urls[social.key]}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={fill(label, { network: social.label })}
              className="grid size-[50px] place-items-center rounded-lg transition-transform hover:scale-110"
            >
              <Image className="max-w-none" src={social.icon} width={social.size} height={social.size} alt="" />
            </a>
          </li>
        ))}
    </ul>
  );
}

async function LiveSocials({ label }: { label: string }) {
  await connection();
  const { company } = await getSiteSettings();
  return <Socials urls={company.socials} label={label} />;
}

/* Cached, so the year is fixed when the page is prerendered instead of read on every request. */
async function CurrentYear() {
  "use cache";
  return new Date().getFullYear();
}

const headingClassName =
  "font-label text-[22px] md:text-[32px] xl:text-[40px] leading-[normal] font-extrabold xl:whitespace-nowrap min-[1440px]:text-5xl";
const linkClassName = "transition-colors hover:text-accent-highlights";

/*
 * Footer (Figma: footer, 1440 wide), added by each page. Not a full-screen section: it sizes to its content.
 *
 * It opens with the "Ready to meet your pal?" card straddling the edge between the light-green contact
 * section and the dark-green footer, as in Figma (half above, half below). The dark green starts with a
 * rounded top-left corner at that edge, so the section above flows into it.
 *
 * Desktop (≥1280px): logo column next to three link columns; from 1440px with Figma's exact widths. Smaller screens: logo block
 * on top, the two link lists side by side, "A little good" below them (beside them from 1024px).
 */
type FooterProps = {
  /**
   * How the footer starts:
   * - "card": the "Ready to meet your pal?" card straddles the edge (homepage, after the contact section)
   * - "corner": the dark green starts with a rounded corner against the page background (create page)
   * - "flush": continues straight from a dark-green section above, divided by a thin line (about page)
   */
  top?: "card" | "corner" | "flush";
  /** With "card": colour above the card's centre line; matches the section before the footer. */
  ctaBackdropClassName?: string;
};

export default async function Footer({
  top = "card",
  ctaBackdropClassName = "bg-light-green",
}: FooterProps) {
  const cta = top === "card";
  const { footer: m, nav } = await getMessages();
  const navigation = [
    {
      title: m.discover,
      links: [
        { label: m.createPalley, href: "/create" },
        { label: m.shopCollection, href: "/shop" },
        { label: m.howItWorks, href: "/#how-it-works" },
        { label: m.about, href: "/about" },
      ],
    },
    {
      title: m.help,
      links: [
        { label: m.contact, href: "/#contact" },
        { label: m.faq, href: "/#faq" },
      ],
    },
  ];
  const legalLinks = [
    { label: m.privacy, href: PRIVACY_URL },
    { label: m.terms, href: TERMS_URL },
    { label: m.cookiePolicy, href: "/cookies" },
    { label: m.cookieSettings, href: "/cookies#settings" },
  ];

  return (
    <footer
      className={`text-off-white ${top === "corner" ? "bg-page" : "bg-medium-green"}`}
    >
      {cta ? (
        <div className={ctaBackdropClassName}>
          <div className="relative section-x lg:px-20">
            <div
              className="absolute inset-x-0 bottom-0 h-1/2 rounded-tl-section bg-medium-green"
              aria-hidden
            />
            <div data-animate="pop" className="relative mx-auto max-w-[1280px]">
              <CtaCard />
            </div>
          </div>
        </div>
      ) : top === "corner" ? (
        <div
          className="h-[var(--radius-section)] rounded-tl-section bg-medium-green"
          aria-hidden
        />
      ) : (
        <div
          className="mx-auto max-w-[var(--container-page)] px-[clamp(20px,2.7vw,52px)] pb-12 md:pb-16"
          aria-hidden
        >
          <hr className="border-off-white/20" />
        </div>
      )}

      <div className="bg-medium-green">
        <div
          className={`mx-auto flex w-full max-w-[var(--container-page)] flex-col gap-12 px-[clamp(20px,2.7vw,52px)] pb-4 xl:gap-[73px] ${cta ? "section-pt xl:pt-[clamp(120px,16.3vw,235px)]" : "pt-0"}`}
        >
          {/* From xl the brand and the three columns spread over the full width, so they line up with the line below. */}
          <div className="flex flex-col gap-12 xl:flex-row xl:justify-between xl:gap-10">
            {/* Brand: logo, tagline and socials */}
            <div className="flex flex-col gap-8 xl:w-[clamp(300px,25.8vw,371px)] xl:shrink-0 xl:gap-[53px]">
              <div className="flex flex-col gap-5 xl:gap-[30px]">
                <Link
                  href="/"
                  aria-label={nav.homeLabel}
                  className="w-fit"
                >
                  <Image
                    className="h-auto w-[clamp(200px,24.2vw,349px)]"
                    src="/images/footer/palleys-logo.svg"
                    width={349}
                    height={187.756}
                    alt=""
                  />
                </Link>
                <p className="font-label text-2xl leading-[normal] font-extrabold md:text-[32px]">
                  {m.tagline}
                </p>
                <p className="font-label text-xl leading-[normal] md:text-2xl">
                  {m.subtextLine1}
                  <br />
                  {m.subtextLine2}
                </p>
              </div>

              <Suspense fallback={<Socials urls={SOCIAL_LINKS} label={m.social} />}>
                <LiveSocials label={m.social} />
              </Suspense>
            </div>

            {/* Link columns */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:gap-x-12 lg:grid-cols-[auto_auto_1fr] lg:gap-x-[clamp(32px,4.2vw,61px)] xl:contents">
              {navigation.map((column) => (
                <nav
                  key={column.title}
                  aria-label={column.title}
                  className="flex flex-col gap-5"
                >
                  <h2 className={headingClassName}>{column.title}</h2>
                  <ul className="flex flex-col gap-4 font-label text-base leading-[normal] md:gap-5 md:text-2xl">
                    {column.links.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} className={linkClassName}>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}

              <div className="col-span-2 flex flex-col items-start gap-5 lg:col-span-1 xl:max-w-[clamp(280px,24vw,420px)]">
                <h2 className={headingClassName}>{m.doingGood}</h2>
                <p className="font-label text-base leading-[normal] md:text-2xl">
                  {m.charityText}
                </p>
                <Link
                  href="/#charity"
                  className="group flex items-center gap-2.5 border-b border-light-green py-s text-xl leading-[19.5px] font-bold transition-colors hover:border-accent-highlights md:text-2xl"
                >
                  {m.charityLink}
                  <span
                    className="grid h-[33.935px] w-[35.969px] place-items-center"
                    aria-hidden
                  >
                    <Image
                      className="max-w-none -rotate-[31.9deg] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      src="/images/arrow-diagonal.svg"
                      width={30.0476}
                      height={23.7037}
                      alt=""
                    />
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Copyright bar */}
          <div className="flex flex-col gap-3 border-t border-off-white py-[9px] text-base leading-[19.5px] md:text-xl lg:flex-row lg:items-center lg:justify-between">
            <p className="flex items-center gap-[5px]">
              <Image
                src="/images/footer/copyright.svg"
                width={26.5}
                height={26.5}
                alt=""
                aria-hidden
              />
              <span>
                <CurrentYear /> {m.rights}
              </span>
            </p>
            <ul className="flex flex-wrap items-center">
              {legalLinks.map((link, index) => (
                <li key={link.href} className="flex items-center">
                  {index > 0 && (
                    <span className="px-[5px]" aria-hidden>
                      |
                    </span>
                  )}
                  <Link href={link.href} className={linkClassName}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
