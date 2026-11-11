import type { Metadata } from "next";
import LegalDocumentPage from "@/components/functional/shop/legal/LegalDocumentPage";
import { metadataLocale } from "@/core/locale/server";
import { RETURN_POLICY_URL } from "@/data/returns";
import { pageMetadata } from "@/core/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/[lang]/retourbeleid">): Promise<Metadata> {
  const { locale, messages } = await metadataLocale(params);
  const m = messages.meta.returnPolicy;
  return pageMetadata({ locale, path: RETURN_POLICY_URL, title: m.title, description: m.description });
}

// LEGAL-REVIEW: the text is managed in /admin/settings/legal (core/modules/legal); until the first publication the one
// in src/core/locale/messages applies. ?versie=... shows an older version.
export default function ReturnPolicyPage({ searchParams }: PageProps<"/[lang]/retourbeleid">) {
  return <LegalDocumentPage slug="returns" searchParams={searchParams} />;
}
