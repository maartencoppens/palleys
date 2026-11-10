import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import Cart, { CartSkeleton } from "@/components/functional/shop/cart/Cart";
import { getMessages, getSiteContent, metadataLocale } from "@/core/locale/server";
import { getSiteSettings } from "@/core/modules/settings/service";
import { editions } from "@/data/options";
import Footer from "@/components/functional/shop/layout/Footer";
import InfoBanner from "@/components/functional/shop/home/InfoBanner";
import Navbar from "@/components/functional/shop/layout/Navbar";

export async function generateMetadata({ params }: PageProps<"/[lang]/cart">): Promise<Metadata> {
  const { messages } = await metadataLocale(params);
  return { title: messages.meta.cart, robots: { index: false } };
}

async function LiveCart() {
  await connection();
  const [content, { catalog }] = await Promise.all([getSiteContent(), getSiteSettings()]);
  const animals = catalog.animals
    .filter((animal) => !catalog.disabledAnimals.includes(animal.value))
    .map((animal) => ({ value: animal.value, labels: animal.labels }));
  const onSale = editions.map((edition) => edition.value).filter((edition) => !catalog.disabledEditions.includes(edition));
  return <Cart deliveryTime={content.deliveryTime} returnNote={content.returnNote} animals={animals} editions={onSale} />;
}

export default async function CartPage() {
  const { cart: m } = await getMessages();
  return (
    <>
      <div className="bg-hero">
        <InfoBanner />
        <div className="page-container py-m">
          <Navbar />
        </div>
      </div>

      <main className="bg-page">
        <div className="mx-auto flex max-w-[1224px] flex-col gap-8 section-x section-pb pt-8 md:pt-12 lg:px-8">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-4xl leading-[1.1] font-bold text-medium-green md:text-5xl">
              {m.title}
            </h1>
            <p className="text-base leading-[1.5] text-text-primary md:text-lg">
              {m.subtitle}
            </p>
          </div>
          <Suspense fallback={<CartSkeleton />}>
            <LiveCart />
          </Suspense>
        </div>
      </main>

      <Footer top="corner" />
    </>
  );
}
