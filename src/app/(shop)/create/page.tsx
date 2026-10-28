import type { Metadata } from "next";
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
        <Configurator />
      </main>

      <Footer top="corner" />
      <SiteAnimations />
    </>
  );
}
