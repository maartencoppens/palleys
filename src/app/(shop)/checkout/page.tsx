import type { Metadata } from "next";
import CheckoutForm from "@/components/functional/shop/checkout/CheckoutForm";
import Footer from "@/components/functional/shop/layout/Footer";
import InfoBanner from "@/components/functional/shop/home/InfoBanner";
import Navbar from "@/components/functional/shop/layout/Navbar";

export const metadata: Metadata = {
  title: "Afrekenen | Palleys",
  robots: { index: false },
};

export default function CheckoutPage() {
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
            <h1 className="font-display text-4xl leading-[1.1] font-bold text-medium-green md:text-5xl">Afrekenen</h1>
            <p className="text-base leading-[1.5] text-text-primary md:text-lg">
              Nog één stap: vul je gegevens in en betaal veilig met Bancontact.
            </p>
          </div>
          <CheckoutForm />
        </div>
      </main>

      <Footer top="corner" />
    </>
  );
}
