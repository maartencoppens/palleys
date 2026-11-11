import type { Metadata } from "next";
import LegalDocumentPage from "@/components/functional/shop/legal/LegalDocumentPage";
import { metadataLocale } from "@/core/locale/server";
import { CONTACT_DETAILS_URL } from "@/data/company";
import { pageMetadata } from "@/core/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/[lang]/contactgegevens">): Promise<Metadata> {
  const { locale, messages } = await metadataLocale(params);
  const m = messages.meta.contactDetails;
  return pageMetadata({ locale, path: CONTACT_DETAILS_URL, title: m.title, description: m.description });
}

// LEGAL-REVIEW: the text is managed in /admin/settings/legal (core/modules/legal); until the first publication the one
// in src/core/locale/messages applies. ?versie=... shows an older version.
export default function ContactDetailsPage({ searchParams }: PageProps<"/[lang]/contactgegevens">) {
  return <LegalDocumentPage slug="contact" searchParams={searchParams} />;
}
