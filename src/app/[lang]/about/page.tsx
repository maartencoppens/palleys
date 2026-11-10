import CtaCard from "@/components/design/CtaCard";
import PageHero from "@/components/design/PageHero";
import Story from "@/components/functional/shop/about/Story";
import StudentCompany from "@/components/functional/shop/about/StudentCompany";
import Team from "@/components/functional/shop/about/Team";
import Charity from "@/components/functional/shop/home/Charity";
import Footer from "@/components/functional/shop/layout/Footer";
import SiteAnimations from "@/components/functional/SiteAnimations";
import { getMessages, metadataLocale } from "@/core/locale/server";
import type { Metadata } from "next";
import { pageMetadata } from "@/core/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/[lang]/about">): Promise<Metadata> {
  const { locale, messages } = await metadataLocale(params);
  const m = messages.meta.about;
  return pageMetadata({ locale, path: "/about", title: m.title, description: m.description, keywords: m.keywords });
}

/*
 * About us (Figma: About us, 1440×5388). Charity and the "Ready to meet your pal?" card are the same as
 * on the homepage, so those components are reused.
 *
 * The card gets its own cream section right after the team ("now you know us – make your own"), so it
 * stands apart instead of reading as part of the footer. The charity block then closes the page and
 * runs straight into the footer as one green ending.
 */
export default async function AboutPage() {
  const { about: m } = await getMessages();
  return (
    <>
      <PageHero
        eyebrow={m.eyebrow}
        title={m.title}
        intro={m.intro}
      />
      <main className="bg-off-white">
        <Story />
        <StudentCompany />
        <Team />
        <section
          aria-label={m.ctaLabel}
          className="section-x section-pb lg:px-20"
        >
          <div data-animate="pop" className="mx-auto max-w-[1280px]">
            <CtaCard />
          </div>
        </section>
        <Charity flowsIntoFooter />
      </main>
      <Footer top="flush" />
      <SiteAnimations />
    </>
  );
}
