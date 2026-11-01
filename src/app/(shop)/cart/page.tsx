import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import Cart, { CartSkeleton } from "@/components/functional/shop/cart/Cart";
import { getSiteSettings } from "@/core/modules/settings/service";
import Footer from "@/components/functional/shop/layout/Footer";
import InfoBanner from "@/components/functional/shop/home/InfoBanner";
import Navbar from "@/components/functional/shop/layout/Navbar";

export const metadata: Metadata = {
  title: "Winkelmandje | Palleys",
  robots: { index: false },
};

async function LiveCart() {
  await connection();
  const { content } = await getSiteSettings();
  return <Cart deliveryTime={content.deliveryTime} returnNote={content.returnNote} />;
}

export default function CartPage() {
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
              Winkelmandje
            </h1>
            <p className="text-base leading-[1.5] text-text-primary md:text-lg">
              Bijna klaar! Kijk je Palleys na en reken veilig af.
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
