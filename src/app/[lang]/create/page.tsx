import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getLocale, getMessages, metadataLocale } from "@/core/locale/server";
import { getSiteSettings } from "@/core/modules/settings/service";
import Configurator from "@/components/functional/create/Configurator";
import Footer from "@/components/functional/shop/layout/Footer";
import InfoBanner from "@/components/functional/shop/home/InfoBanner";
import Navbar from "@/components/functional/shop/layout/Navbar";
import SiteAnimations from "@/components/functional/SiteAnimations";
import { pageMetadata } from "@/core/seo/metadata";
import JsonLd from "@/components/functional/seo/JsonLd";
import { MESSAGES } from "@/core/locale/messages";
import { editionPriceCents } from "@/core/modules/catalog/utils";
import { productData } from "@/core/seo/structured-data";
import { editions } from "@/data/options";

export async function generateMetadata({ params }: PageProps<"/[lang]/create">): Promise<Metadata> {
  const { locale, messages } = await metadataLocale(params);
  const m = messages.meta.create;
  return pageMetadata({ locale, path: "/create", title: m.title, description: m.description, keywords: m.keywords });
}

/*
 * Prices and options come from the settings. SiteAnimations renders in here, after the configurator: it has to run
 * once these elements exist, or their data-animate reveal never happens.
 */
async function LiveConfigurator() {
  await connection();
  const [{ catalog, content: allContent }, locale] = await Promise.all([getSiteSettings(), getLocale()]);
  const content = allContent[locale];
  const { meta, cart } = MESSAGES[locale];
  // From the cheapest to the dearest edition on sale.
  const prices = editions
    .filter((edition) => !catalog.disabledEditions.includes(edition.value))
    .map((edition) => editionPriceCents(edition.value, catalog.prices));
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  return (
    <>
      {/* The Palley op maat as a product for search engines: its price, and that it's made for you (no returns). */}
      <JsonLd
        data={productData({
          locale,
          name: cart.personalized,
          description: meta.create.description,
          path: "/create",
          image: "/images/cta/golden-retriever.jpg",
          priceCents: low === high ? low : { low, high },
          availability: "InStock",
          returnable: false,
        })}
      />
      <Configurator catalog={catalog} deliveryTime={content.deliveryTime} returnNote={content.returnNote} />
      <SiteAnimations />
    </>
  );
}

export default async function CreatePage() {
  const { create: m } = await getMessages();
  return (
    <>
      {/* Same banner and navbar as the homepage, on the hero green. The navbar doesn't follow the scroll here: the stepper sticks instead. */}
      <div className="bg-hero">
        <InfoBanner />
        <div className="page-container py-m">
          <Navbar pinOnScroll={false} />
        </div>
      </div>

      <main className="bg-page">
        <h1 className="sr-only">{m.heading}</h1>
        <Suspense
          fallback={
            <div className="mx-auto max-w-[1224px] section-x section-pb pt-6 md:pt-12 lg:px-8" role="status" aria-label={m.loading}>
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
