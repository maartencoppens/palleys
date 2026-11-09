import type { Metadata } from "next";
import CompanyValue from "@/components/functional/shop/legal/CompanyValue";
import LegalPage from "@/components/functional/shop/legal/LegalPage";
import LegalText from "@/components/functional/shop/legal/LegalText";
import { getMessages, localeAlternates, metadataLocale } from "@/core/locale/server";
import { PRIVACY_URL } from "@/data/checkout";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { locale, messages } = await metadataLocale(params);
  return { title: messages.meta.privacy, alternates: localeAlternates(locale, PRIVACY_URL) };
}

// LEGAL-REVIEW: the privacy policy; company name, address and e-mail come from the company settings.
export default async function PrivacyPage() {
  const { legal: m } = await getMessages();
  return (
    <LegalPage eyebrow={m.eyebrow} title={m.privacy.title} intro={m.privacy.intro}>
      <LegalText
        sections={m.privacy.sections}
        values={{ email: <CompanyValue field="email" />, companyAddress: <CompanyValue field="nameAddress" /> }}
      />
    </LegalPage>
  );
}
