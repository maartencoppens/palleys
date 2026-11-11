import type { Metadata } from "next";
import LegalDocumentPage from "@/components/functional/shop/legal/LegalDocumentPage";
import { metadataLocale } from "@/core/locale/server";
import { PRIVACY_URL } from "@/data/checkout";
import { pageMetadata } from "@/core/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { locale, messages } = await metadataLocale(params);
  const m = messages.meta.privacy;
  return pageMetadata({ locale, path: PRIVACY_URL, title: m.title, description: m.description });
}

// LEGAL-REVIEW: the text is managed in /admin/settings/legal (core/modules/legal); until the first publication the one
// in src/core/locale/messages applies. ?versie=... shows an older version.
export default function PrivacyPage({ searchParams }: PageProps<"/[lang]/privacy">) {
  return <LegalDocumentPage slug="privacy" searchParams={searchParams} />;
}
