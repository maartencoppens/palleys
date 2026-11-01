import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import Button from "@/components/design/Button";
import PageHero from "@/components/design/PageHero";
import { CollectibleCardSkeleton, CollectibleGrid } from "@/components/functional/shop/collection/CollectibleGrid";
import Footer from "@/components/functional/shop/layout/Footer";
import SiteAnimations from "@/components/functional/SiteAnimations";
import { listPublishedCollectibles } from "@/core/modules/collectibles/service";

export const metadata: Metadata = {
  title: "Collectie | Palleys",
  description: "Kant-en-klare Palleys, klaar om mee te nemen: 3D-geprint en met de hand afgewerkt in Gent.",
};

async function LiveCollection() {
  await connection();
  const collectibles = await listPublishedCollectibles();
  if (collectibles.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-3xl bg-white px-6 py-14 text-center">
        <p className="font-display text-2xl font-bold text-medium-green">Binnenkort vind je hier onze collectie</p>
        <p className="max-w-md text-base text-text-primary">Ondertussen maken we graag een Palley van jouw eigen huisdier.</p>
        <Button variant="primary" href="/create">
          Maak je Palley
        </Button>
      </div>
    );
  }
  return <CollectibleGrid collectibles={collectibles} />;
}

export default function ShopPage() {
  return (
    <>
      <PageHero
        eyebrow="Collectie"
        title="Klaar om mee te nemen"
        intro="Onze eigen modellen, 3D-geprint en met de hand afgewerkt in Gent. Geen foto nodig: kiezen, bestellen en klaar."
      />
      <main className="bg-page">
        <div className="mx-auto max-w-[1440px] section-x section-pb pt-10 md:pt-14">
          <Suspense
            fallback={
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="status" aria-label="Collectie laden">
                {[0, 1, 2, 3].map((key) => (
                  <CollectibleCardSkeleton key={key} />
                ))}
              </div>
            }
          >
            <LiveCollection />
          </Suspense>
        </div>
      </main>
      <Footer top="corner" />
      <SiteAnimations />
    </>
  );
}
