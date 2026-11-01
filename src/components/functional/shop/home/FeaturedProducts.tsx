import { connection } from "next/server";
import { Suspense } from "react";
import Button from "@/components/design/Button";
import SectionHeader from "@/components/design/SectionHeader";
import { CollectibleCard, CollectibleCardSkeleton } from "@/components/functional/shop/collection/CollectibleGrid";
import { listPublishedCollectibles } from "@/core/modules/collectibles/service";
import { HOME_COLLECTIBLE_LIMIT } from "@/data/collectibles";

const rowClassName =
  "flex w-full max-w-[1440px] snap-x snap-mandatory scroll-px-[var(--space-section-x)] gap-[31px] overflow-x-auto section-x pb-2 [scrollbar-width:none] xl:grid xl:grid-cols-4 xl:overflow-visible xl:px-[clamp(16px,3.26vw,47px)] xl:pb-0";
const itemClassName = "w-[min(313px,80vw)] shrink-0 snap-start xl:w-auto";

/* From the database, so without data-animate: this arrives after the page's animations have been set up. */
async function LiveProducts() {
  await connection();
  const collectibles = await listPublishedCollectibles(HOME_COLLECTIBLE_LIMIT).catch((error) => {
    console.error("[home] collectibles unavailable:", error instanceof Error ? error.message : error);
    return [];
  });
  if (collectibles.length === 0) {
    return <p className="section-x text-center text-lg text-text-primary">Binnenkort vind je hier onze kant-en-klare Palleys.</p>;
  }
  return (
    <>
      <ul className={rowClassName}>
        {collectibles.map((collectible) => (
          <li key={collectible.id} className={itemClassName}>
            <CollectibleCard collectible={collectible} />
          </li>
        ))}
      </ul>
      <Button href="/shop" size="large">
        Bekijk de hele collectie
      </Button>
    </>
  );
}

/*
 * "Explore our collectables" (Figma: featured-products-section, 1440×730). Same page background as
 * the section above, so it flows on without a seam.
 * From 1280px: four 313px cards, 31px apart. Below that the cards become a swipeable row
 * that snaps per card, which keeps the section within one screen on tablets and phones.
 */
export default function FeaturedProducts() {
  return (
    <section
      id="collectables"
      className="flex min-h-svh flex-col items-center justify-center stack bg-page section-y xl:gap-[50px] xl:py-[104px]"
      aria-labelledby="collectables-title"
    >
      <SectionHeader
        tag="Klaar om mee te nemen"
        title="Ontdek onze collectie"
        titleId="collectables-title"
      />

      <Suspense
        fallback={
          <ul className={rowClassName} aria-hidden>
            {Array.from({ length: HOME_COLLECTIBLE_LIMIT }, (_, key) => (
              <li key={key} className={itemClassName}>
                <CollectibleCardSkeleton />
              </li>
            ))}
          </ul>
        }
      >
        <LiveProducts />
      </Suspense>
    </section>
  );
}
