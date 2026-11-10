import { connection } from "next/server";
import { Suspense } from "react";
import SectionHeader from "@/components/design/SectionHeader";
import { getLocale, getMessages, getSiteContent } from "@/core/locale/server";
import type { SiteContent } from "@/core/modules/settings/types";
import { DEFAULT_SITE_CONTENT } from "@/data/site-content";
import JsonLd from "@/components/functional/seo/JsonLd";
import { faqData } from "@/core/seo/structured-data";

// The name makes it an exclusive accordion. The starting values and the live list are in the page at the same time while
// it streams, so they need a name each: with one name the browser closes the first list's open question before React hydrates.
function FaqList({ faqs, name }: { faqs: SiteContent["faq"]; name: string }) {
  return faqs.map((faq, index) => (
    <details key={index} name={name} open={index === 0} className="faq-item group border-t border-medium-green">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-medium-green md:py-6 [&::-webkit-details-marker]:hidden">
        <h3 className="font-display text-xl leading-[1.25] font-bold transition-transform duration-300 ease-[cubic-bezier(0.34,1.25,0.64,1)] group-hover:translate-x-1 motion-reduce:transition-none md:text-[26px] lg:text-[32px]">
          {faq.question}
        </h3>
        {/* Plus that turns into a minus when open: it makes a half turn while the vertical bar folds away. */}
        <span
          className="relative size-4 shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.25,0.64,1)] group-open:rotate-180 motion-reduce:transition-none md:size-5"
          aria-hidden
        >
          <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-current" />
          <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-current transition-transform duration-300 group-open:scale-y-0 motion-reduce:transition-none" />
        </span>
      </summary>
      <p className="pb-6 text-base leading-[1.5] text-medium-green group-open:animate-faq-answer motion-reduce:animate-none md:-mt-1 md:pb-7 md:text-xl lg:text-2xl">
        {faq.answer}
      </p>
    </details>
  ));
}

async function LiveFaqList() {
  await connection();
  const content = await getSiteContent();
  return (
    <>
      <FaqList faqs={content.faq} name="faq" />
      {/* The same questions for search engines, which can show them right in the results. */}
      <JsonLd data={faqData(content.faq)} />
    </>
  );
}

/*
 * "Frequently asked questions" (Figma: faq-section, 1440×959). Same page background as the cream
 * corner of the charity section above, so it flows on without a seam.
 *
 * Built on <details>/<summary>: keyboard and screen-reader friendly without JavaScript. Opening and closing is
 * animated in CSS (globals.css, .faq-item): the answer folds open, hops in like the hero caption, and the +/−
 * makes a half turn, all with the bouncy ease used elsewhere on the page. The shared
 * `name` makes it an exclusive accordion (opening one question closes the other), and the first one
 * starts open as in Figma.
 *
 * Spacing differs from Figma on purpose: each question gets even padding above and below (Figma pads
 * only the top, leaving the row top-heavy), the +/− lines up with the question, and the answer sits
 * closer to its question than to the next one.
 */
export default async function Faq() {
  const [{ faq: m }, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <section
      id="faq"
      className="flex min-h-svh flex-col items-center justify-center stack bg-page section-x section-y"
      aria-labelledby="faq-title"
    >
      <SectionHeader
        tag={m.tag}
        title={m.title}
        subtitle={m.subtitle}
        titleId="faq-title"
      />

      {/* From /admin/settings/content, so without data-animate: it arrives after the animations are set up. */}
      <div className="w-full max-w-[837px] border-b border-medium-green">
        <Suspense fallback={<FaqList faqs={DEFAULT_SITE_CONTENT[locale].faq} name="faq-loading" />}>
          <LiveFaqList />
        </Suspense>
      </div>
    </section>
  );
}
