import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import JsonLd from "@/components/functional/seo/JsonLd";
import type { Locale } from "@/core/locale/config";
import { getSiteSettings } from "@/core/modules/settings/service";
import { organizationData, websiteData } from "@/core/seo/structured-data";
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
import { metadataLocale } from "@/core/locale/server";
import { pageMetadata } from "@/core/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { locale, messages } = await metadataLocale(params);
  const m = messages.meta.site;
  return pageMetadata({ locale, path: "/", title: m.title, description: m.description, keywords: m.keywords });
}

/** Who Palleys is, for search engines: the company details come from the backoffice settings. */
async function SiteData({ locale }: { locale: Locale }) {
  await connection();
  const { company } = await getSiteSettings();
  return <JsonLd data={[organizationData(company, locale), websiteData(locale)]} />;
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { locale } = await metadataLocale(params);
  return (
    <>
      <Suspense fallback={null}>
        <SiteData locale={locale} />
      </Suspense>
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
