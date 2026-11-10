import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import Button from "@/components/design/Button";
import PageHero from "@/components/design/PageHero";
import { CollectibleCardSkeleton, CollectibleGrid } from "@/components/functional/shop/collection/CollectibleGrid";
import Footer from "@/components/functional/shop/layout/Footer";
import SiteAnimations from "@/components/functional/SiteAnimations";
import { getLocale, getMessages, localeAlternates, metadataLocale } from "@/core/locale/server";
import { listPublishedCollectibles } from "@/core/modules/collectibles/service";

export async function generateMetadata({ params }: PageProps<"/[lang]/shop">): Promise<Metadata> {
  const { locale, messages } = await metadataLocale(params);
  return { ...messages.meta.shop, alternates: localeAlternates(locale, "/shop") };
}

async function LiveCollection() {
  await connection();
  const [collectibles, { shop: m, common }] = await Promise.all([getLocale().then((locale) => listPublishedCollectibles(locale)), getMessages()]);
  if (collectibles.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-3xl bg-white px-6 py-14 text-center">
        <p className="font-display text-2xl font-bold text-medium-green">{m.emptyTitle}</p>
        <p className="max-w-md text-base text-text-primary">{m.emptyText}</p>
        <Button variant="primary" href="/create">
          {common.createPalley}
        </Button>
      </div>
    );
  }
  return <CollectibleGrid collectibles={collectibles} />;
}

export default async function ShopPage() {
  const { shop: m } = await getMessages();
  return (
    <>
      <PageHero
        eyebrow={m.eyebrow}
        title={m.title}
        intro={m.intro}
        backdropClassName="bg-page"
      />
      <main className="bg-page">
        <div className="mx-auto max-w-[1440px] section-x section-pb pt-10 md:pt-14">
          <Suspense
            fallback={
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="status" aria-label={m.loading}>
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
