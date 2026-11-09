import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/core/locale/client";
import { fill } from "@/core/locale/fill";
import { getLocale, getMessages, getSiteContent, metadataLocale } from "@/core/locale/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import AddCollectibleToCart from "@/components/functional/shop/collection/AddCollectibleToCart";
import Availability from "@/components/functional/shop/collection/Availability";
import InfoBanner from "@/components/functional/shop/home/InfoBanner";
import Footer from "@/components/functional/shop/layout/Footer";
import Navbar from "@/components/functional/shop/layout/Navbar";
import SiteAnimations from "@/components/functional/SiteAnimations";
import { Badge } from "@/components/design/Badge";
import WarningNote from "@/components/design/WarningNote";
import { getPublishedCollectible } from "@/core/modules/collectibles/service";
import { formatPrice } from "@/core/utils/format";
import { shownSizeLabel } from "@/core/modules/catalog/utils";

// The URL is only known per request, and the navbar's cart reads it (usePathname), so this page can't be prerendered.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[lang]/shop/[slug]">): Promise<Metadata> {
  const { messages } = await metadataLocale(params);
  return { title: messages.meta.shop.title };
}

async function LiveCollectible({ params }: { params: PageProps<"/[lang]/shop/[slug]">["params"] }) {
  await connection();
  const { slug } = await params;
  const [collectible, content, messages, locale] = await Promise.all([getLocale().then((locale) => getPublishedCollectible(slug, locale)), getSiteContent(), getMessages(), getLocale()]);
  const m = messages.shop;
  if (!collectible) notFound();

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12">
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-light-green">
        <Image
          src={collectible.imageUrl!}
          alt={fill(messages.collection.imageAlt, { name: collectible.name })}
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
          {formatPrice(collectible.priceCents / 100, locale)}
        </p>
        <p className="-mt-3 text-sm text-text-primary">{m.exclShipping}</p>
        {collectible.description && (
          <p className="whitespace-pre-line text-base leading-[1.5] text-text-primary md:text-lg">{collectible.description}</p>
        )}
        {/* Art. 2.3 of the terms: the dimensions are with the product. */}
        <p className="text-base leading-[1.5] text-text-primary">{fill(messages.create.choose.size, { size: shownSizeLabel(locale) })}</p>
        {collectible.soldOut ? (
          <Badge tone="danger">{messages.collection.soldOut}</Badge>
        ) : (
          <>
            <Availability />
            <AddCollectibleToCart collectibleId={collectible.id} />
          </>
        )}
        <p className="text-base leading-[1.5] text-text-primary">{fill(m.delivery, { deliveryTime: content.deliveryTime })}</p>
        <WarningNote>{messages.common.heatWarning}</WarningNote>
        <p className="text-sm leading-[1.5] text-text-muted">{m.returnNote}</p>
      </div>
    </div>
  );
}

export default async function CollectiblePage({ params }: PageProps<"/[lang]/shop/[slug]">) {
  const { shop: m } = await getMessages();
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
            {m.back}
          </Link>
          <Suspense fallback={<div className="h-[480px] animate-pulse rounded-3xl bg-white" role="status" aria-label={m.productLoading} />}>
            <LiveCollectible params={params} />
          </Suspense>
        </div>
      </main>
      <Footer top="corner" />
      <SiteAnimations />
    </>
  );
}
