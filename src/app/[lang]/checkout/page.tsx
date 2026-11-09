import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getMessages, getSiteContent, metadataLocale } from "@/core/locale/server";
import { getSiteSettings } from "@/core/modules/settings/service";
import CheckoutForm from "@/components/functional/shop/checkout/CheckoutForm";
import Footer from "@/components/functional/shop/layout/Footer";
import InfoBanner from "@/components/functional/shop/home/InfoBanner";
import Navbar from "@/components/functional/shop/layout/Navbar";

export async function generateMetadata({ params }: PageProps<"/[lang]/checkout">): Promise<Metadata> {
  const { messages } = await metadataLocale(params);
  return { title: messages.meta.checkout, robots: { index: false } };
}

async function LiveCheckoutForm() {
  await connection();
  const [content, { company }] = await Promise.all([getSiteContent(), getSiteSettings()]);
  return <CheckoutForm deliveryTime={content.deliveryTime} instagramUrl={company.socials.instagram} />;
}

export default async function CheckoutPage() {
  const { checkout: m, common } = await getMessages();
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
            <h1 className="font-display text-4xl leading-[1.1] font-bold text-medium-green md:text-5xl">{m.title}</h1>
            <p className="text-base leading-[1.5] text-text-primary md:text-lg">
              {m.subtitle}
            </p>
          </div>
          <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-white md:rounded-[32px]" role="status" aria-label={common.loading} />}>
            <LiveCheckoutForm />
          </Suspense>
        </div>
      </main>

      <Footer top="corner" />
    </>
  );
}
