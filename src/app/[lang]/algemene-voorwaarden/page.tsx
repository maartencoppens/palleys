import type { Metadata } from "next";
import LegalDocumentPage from "@/components/functional/shop/legal/LegalDocumentPage";
import { metadataLocale } from "@/core/locale/server";
import { TERMS_URL } from "@/data/checkout";
import { pageMetadata } from "@/core/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/[lang]/algemene-voorwaarden">): Promise<Metadata> {
  const { locale, messages } = await metadataLocale(params);
  const m = messages.meta.terms;
  return pageMetadata({ locale, path: TERMS_URL, title: m.title, description: m.description });
}

// LEGAL-REVIEW: the terms are managed in /admin/settings/legal (core/modules/legal). ?versie=... shows the version an
// order accepted (Order.termsVersion, linked from the confirmation mail).
export default function TermsPage({ searchParams }: PageProps<"/[lang]/algemene-voorwaarden">) {
  return <LegalDocumentPage slug="terms" searchParams={searchParams} />;
}
