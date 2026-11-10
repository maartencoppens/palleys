import type { ReactNode } from "react";
import PageHero from "@/components/design/PageHero";
import Footer from "@/components/functional/shop/layout/Footer";

type LegalPageProps = { eyebrow: string; title: string; intro: string; children: ReactNode };

/* Shared layout for the legal pages. */
export default async function LegalPage({ eyebrow, title, intro, children }: LegalPageProps) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} intro={intro} />
      <main className="bg-off-white">
        <article className="mx-auto flex max-w-[760px] flex-col gap-6 section-x section-pb pt-10 text-base leading-[1.6] text-text-primary md:pt-14 md:text-lg [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-medium-green [&_ul]:list-disc [&_ul]:pl-6">
          {children}
        </article>
      </main>
      <Footer top="corner" />
    </>
  );
}
