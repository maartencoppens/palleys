import type { Metadata } from "next";
import CompanyValue from "@/components/functional/shop/legal/CompanyValue";
import LegalPage from "@/components/functional/shop/legal/LegalPage";
import LegalText from "@/components/functional/shop/legal/LegalText";
import { Link } from "@/core/locale/client";
import { getMessages, localeAlternates, metadataLocale } from "@/core/locale/server";
import { TERMS_URL } from "@/data/checkout";
import { RETURN_POLICY_URL, RETURN_URL } from "@/data/returns";

export async function generateMetadata({ params }: PageProps<"/[lang]/retourbeleid">): Promise<Metadata> {
  const { locale, messages } = await metadataLocale(params);
  return { title: messages.meta.returnPolicy, alternates: localeAlternates(locale, RETURN_POLICY_URL) };
}

const linkClassName = "font-semibold text-medium-green underline underline-offset-2";

// LEGAL-REVIEW: the return and refund policy; e-mail and return address come from the company settings.
export default async function ReturnPolicyPage() {
  const { legal: m } = await getMessages();
  return (
    <LegalPage eyebrow={m.eyebrow} title={m.returnPolicy.title} intro={m.returnPolicy.intro}>
      <LegalText
        sections={m.returnPolicy.sections}
        values={{
          email: <CompanyValue field="email" />,
          returnAddress: <CompanyValue field="returnAddress" />,
          companyContact: <CompanyValue field="contact" />,
          returnUrl: (
            <Link href={RETURN_URL} className={linkClassName}>
              palleys.be/retour
            </Link>
          ),
          terms: (
            <Link href={TERMS_URL} className={linkClassName}>
              {m.returnPolicy.termsLink}
            </Link>
          ),
        }}
      />
    </LegalPage>
  );
}
