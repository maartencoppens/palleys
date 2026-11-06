import Contact from "@/components/functional/shop/contact/Contact";
import Charity from "@/components/functional/shop/home/Charity";
import Faq from "@/components/functional/shop/home/Faq";
import FeaturedProducts from "@/components/functional/shop/home/FeaturedProducts";
import Hero from "@/components/functional/shop/home/Hero";
import HowItWorks from "@/components/functional/shop/home/HowItWorks";
import MadeInGent from "@/components/functional/shop/home/MadeInGent";
import WhyPalleys from "@/components/functional/shop/home/WhyPalleys";
import Footer from "@/components/functional/shop/layout/Footer";
import SiteAnimations from "@/components/functional/SiteAnimations";

export default function Home() {
  return (
    <>
      <main>
        <Hero />
        <HowItWorks />
        <FeaturedProducts />
        <MadeInGent />
        <WhyPalleys />
        <Charity />
        <Faq />
        <Contact />
      </main>
      <Footer />
      <SiteAnimations />
    </>
  );
}
