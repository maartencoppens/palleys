import CtaCard from "@/components/design/CtaCard";
import PageHero from "@/components/design/PageHero";
import MadeSteps from "@/components/functional/shop/about/MadeSteps";
import Story from "@/components/functional/shop/about/Story";
import StudentCompany from "@/components/functional/shop/about/StudentCompany";
import Team from "@/components/functional/shop/about/Team";
import Charity from "@/components/functional/shop/home/Charity";
import Footer from "@/components/functional/shop/layout/Footer";
import SiteAnimations from "@/components/functional/SiteAnimations";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Over ons | Palleys",
  description:
    "Palleys is een studentenonderneming uit Gent die je favoriete foto van je huisdier omtovert tot een 3D-geprinte sleutelhanger, met de hand afgewerkt. Leer het team kennen en ontdek hoe een Palley ontstaat.",
};

/*
 * About us (Figma: About us, 1440×5388). Charity and the "Ready to meet your pal?" card are the same as
 * on the homepage, so those components are reused.
 *
 * The card gets its own cream section right after the team ("now you know us – make your own"), so it
 * stands apart instead of reading as part of the footer. The charity block then closes the page and
 * runs straight into the footer as one green ending.
 */
export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Over ons"
        title="Gemaakt door dierenmensen"
        intro="We zijn een studententeam uit Gent dat je favoriete foto van je huisdier omtovert tot een kleine 3D-pal voor aan je sleutels."
      />
      <main className="bg-off-white">
        <Story />
        <MadeSteps />
        <StudentCompany />
        <Team />
        <section
          aria-label="Maak je eigen Palley"
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
