import type { Metadata } from "next";
import Cart from "@/components/functional/shop/cart/Cart";
import Footer from "@/components/functional/shop/layout/Footer";
import InfoBanner from "@/components/functional/shop/home/InfoBanner";
import Navbar from "@/components/functional/shop/layout/Navbar";

export const metadata: Metadata = {
  title: "Winkelmandje | Palleys",
  robots: { index: false },
};

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
          <h1 className="font-display text-4xl leading-[1.1] font-bold text-medium-green md:text-5xl">
            Winkelmandje
          </h1>
          <Cart />
        </div>
      </main>

      <Footer top="corner" />
    </>
  );
}
