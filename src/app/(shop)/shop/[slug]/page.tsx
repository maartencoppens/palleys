import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import AddCollectibleToCart from "@/components/functional/shop/collection/AddCollectibleToCart";
import InfoBanner from "@/components/functional/shop/home/InfoBanner";
import Footer from "@/components/functional/shop/layout/Footer";
import Navbar from "@/components/functional/shop/layout/Navbar";
import SiteAnimations from "@/components/functional/SiteAnimations";
import { Badge } from "@/components/design/Badge";
import { getPublishedCollectible } from "@/core/modules/collectibles/service";
import { getSiteSettings } from "@/core/modules/settings/service";
import { formatPrice } from "@/core/utils/format";
import { COLLECTIBLE_RETURN_NOTE } from "@/data/collectibles";

// The URL is only known per request, and the navbar's cart reads it (usePathname), so this page can't be prerendered.
export const instant = false;

export const metadata: Metadata = { title: "Collectie | Palleys" };

async function LiveCollectible({ params }: { params: PageProps<"/shop/[slug]">["params"] }) {
  await connection();
  const { slug } = await params;
  const [collectible, { content }] = await Promise.all([getPublishedCollectible(slug), getSiteSettings()]);
  if (!collectible) notFound();

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12">
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-light-green">
        <Image
          src={collectible.imageUrl!}
          alt={`${collectible.name} sleutelhanger`}
          fill
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-contain p-8"
        />
      </div>
      <div className="flex flex-col items-start gap-5">
        {collectible.tag && <Badge tone="success">{collectible.tag}</Badge>}
        <h1 className="font-display text-4xl leading-[1.1] font-bold text-medium-green md:text-5xl">{collectible.name}</h1>
        <p className="font-label text-[32px] leading-[normal] font-extrabold text-medium-green">
          {formatPrice(collectible.priceCents / 100)}
        </p>
        <p className="-mt-3 text-sm text-text-primary">Incl. btw · verzendkosten bij het afrekenen</p>
        {collectible.description && (
          <p className="whitespace-pre-line text-base leading-[1.5] text-text-primary md:text-lg">{collectible.description}</p>
        )}
        {collectible.soldOut ? (
          <Badge tone="danger">Uitverkocht</Badge>
        ) : (
          <AddCollectibleToCart collectibleId={collectible.id} />
        )}
        <p className="text-base leading-[1.5] text-text-primary">Binnen {content.deliveryTime} valt je bestelling in de bus.</p>
        <p className="text-sm leading-[1.5] text-text-muted">{COLLECTIBLE_RETURN_NOTE}</p>
      </div>
    </div>
  );
}

export default function CollectiblePage({ params }: PageProps<"/shop/[slug]">) {
  return (
    <>
      <div className="bg-hero">
        <InfoBanner />
        <div className="page-container py-m">
          <Navbar />
        </div>
      </div>
      <main className="bg-page">
        <div className="mx-auto flex max-w-[1224px] flex-col gap-6 section-x section-pb pt-8 md:pt-12 lg:px-8">
          <Link
            href="/shop"
            className="w-fit font-label text-base font-bold text-medium-green underline underline-offset-4 hover:text-orange"
          >
            Terug naar de collectie
          </Link>
          <Suspense fallback={<div className="h-[480px] animate-pulse rounded-3xl bg-white" role="status" aria-label="Product laden" />}>
            <LiveCollectible params={params} />
          </Suspense>
        </div>
      </main>
      <Footer top="corner" />
      <SiteAnimations />
    </>
  );
}
