import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSiteSettings } from "@/core/modules/settings/service";
import Configurator from "@/components/functional/create/Configurator";
import Footer from "@/components/functional/shop/layout/Footer";
import InfoBanner from "@/components/functional/shop/home/InfoBanner";
import Navbar from "@/components/functional/shop/layout/Navbar";
import SiteAnimations from "@/components/functional/SiteAnimations";

export const metadata: Metadata = {
  title: "Maak je eigen Palley | Palleys",
  description:
    "Your pet, your pal, your Palley. Upload één foto van je huisdier en wij maken er een 3D-geprinte sleutelhanger van, met de hand afgewerkt in Gent. Klaar in drie stappen.",
};

/*
 * Prices and options come from the settings. SiteAnimations renders in here, after the configurator: it has to run
 * once these elements exist, or their data-animate reveal never happens.
 */
async function LiveConfigurator() {
  await connection();
  const { catalog, content } = await getSiteSettings();
  return (
    <>
      <Configurator catalog={catalog} deliveryTime={content.deliveryTime} returnNote={content.returnNote} />
      <SiteAnimations />
    </>
  );
}

export default function CreatePage() {
  return (
    <>
      {/* Same banner and navbar as the homepage, on the hero green. */}
      <div className="bg-hero">
        <InfoBanner />
        <div className="page-container py-m">
          <Navbar />
        </div>
      </div>

      <main className="bg-page">
        <h1 className="sr-only">
          Your pet, your pal, your Palley: maak je eigen Palley
        </h1>
        <Suspense
          fallback={
            <div className="mx-auto max-w-[1224px] section-x section-pb pt-6 md:pt-12 lg:px-8" role="status" aria-label="Configurator laden">
              <div className="h-[640px] animate-pulse rounded-3xl bg-white md:rounded-[32px]" />
            </div>
          }
        >
          <LiveConfigurator />
        </Suspense>
      </main>

      <Footer top="corner" />
    </>
  );
}
