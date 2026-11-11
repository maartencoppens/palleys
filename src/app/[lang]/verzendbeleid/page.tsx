import type { Metadata } from "next";
import LegalDocumentPage from "@/components/functional/shop/legal/LegalDocumentPage";
import { metadataLocale } from "@/core/locale/server";
import { SHIPPING_POLICY_URL } from "@/data/shipping";
import { pageMetadata } from "@/core/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/[lang]/verzendbeleid">): Promise<Metadata> {
  const { locale, messages } = await metadataLocale(params);
  const m = messages.meta.shippingPolicy;
  return pageMetadata({ locale, path: SHIPPING_POLICY_URL, title: m.title, description: m.description });
}

// LEGAL-REVIEW: the text is managed in /admin/settings/legal (core/modules/legal); until the first publication the one
// in src/core/locale/messages applies. ?versie=... shows an older version.
export default function ShippingPolicyPage({ searchParams }: PageProps<"/[lang]/verzendbeleid">) {
  return <LegalDocumentPage slug="shipping" searchParams={searchParams} />;
}
