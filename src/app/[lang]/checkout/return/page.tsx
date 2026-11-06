import type { Metadata } from "next";
import { Suspense } from "react";
import CheckoutReturn from "@/components/functional/shop/checkout/CheckoutReturn";
import Footer from "@/components/functional/shop/layout/Footer";
import InfoBanner from "@/components/functional/shop/home/InfoBanner";
import Navbar from "@/components/functional/shop/layout/Navbar";
import { metadataLocale } from "@/core/locale/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/checkout/return">): Promise<Metadata> {
  const { messages } = await metadataLocale(params);
  return {
    title: messages.meta.order,
    robots: { index: false, follow: false },
    // The URL carries the order token: don't leak it to other sites through the Referer header.
    referrer: "no-referrer",
  };
}

export default function CheckoutReturnPage() {
  return (
    <>
      <div className="bg-hero">
        <InfoBanner />
        <div className="page-container py-m">
          <Navbar />
        </div>
      </div>

      <main className="bg-page">
        <div className="mx-auto max-w-[760px] section-x section-pb pt-8 md:pt-14">
          {/* useSearchParams needs a Suspense boundary with Cache Components. */}
          <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-white md:rounded-[32px]" />}>
            <CheckoutReturn />
          </Suspense>
        </div>
      </main>

      <Footer top="corner" />
    </>
  );
}
