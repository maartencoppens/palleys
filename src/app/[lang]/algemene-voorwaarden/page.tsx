import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import CompanyValue from "@/components/functional/shop/legal/CompanyValue";
import LegalPage from "@/components/functional/shop/legal/LegalPage";
import LegalText from "@/components/functional/shop/legal/LegalText";
import { Link } from "@/core/locale/client";
import { fill } from "@/core/locale/fill";
import { getMessages, metadataLocale } from "@/core/locale/server";
import { getSiteSettings } from "@/core/modules/settings/service";
import { COMPANY } from "@/data/company";
import { PRIVACY_URL, TERMS_URL, TERMS_VERSION } from "@/data/checkout";
import { RETURN_POLICY_URL } from "@/data/returns";
import { pageMetadata } from "@/core/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/[lang]/algemene-voorwaarden">): Promise<Metadata> {
  const { locale, messages } = await metadataLocale(params);
  const m = messages.meta.terms;
  return pageMetadata({ locale, path: TERMS_URL, title: m.title, description: m.description });
}

type Company = Pick<typeof COMPANY, "legalName" | "address" | "enterpriseNumber" | "email">;

async function CompanyLine({ company }: { company: Company }) {
  const { legal } = await getMessages();
  return fill(company.enterpriseNumber ? legal.terms.companyEnterprise : legal.terms.company, {
    name: company.legalName,
    address: company.address,
    enterprise: company.enterpriseNumber,
    email: company.email,
  });
}

async function LiveCompanyLine() {
  await connection();
  const { company } = await getSiteSettings();
  return <CompanyLine company={company} />;
}

const linkClassName = "font-semibold text-medium-green underline underline-offset-2";

export default async function TermsPage() {
  const { legal: m } = await getMessages();
  return (
    <LegalPage eyebrow={m.eyebrow} title={m.terms.title} intro={fill(m.terms.intro, { version: TERMS_VERSION })}>
      <LegalText
        sections={m.terms.sections}
        values={{
          company: (
            <Suspense fallback={<CompanyLine company={COMPANY} />}>
              <LiveCompanyLine />
            </Suspense>
          ),
          email: <CompanyValue field="email" />,
          returnPolicy: (
            <Link href={RETURN_POLICY_URL} className={linkClassName}>
              {m.terms.returnPolicyLink}
            </Link>
          ),
          privacyPolicy: (
            <Link href={PRIVACY_URL} className={linkClassName}>
              {m.terms.privacyLink}
            </Link>
          ),
        }}
      />
    </LegalPage>
  );
}
