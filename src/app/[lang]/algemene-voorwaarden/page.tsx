import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import DeliveryTime from "@/components/functional/shop/DeliveryTime";
import LegalPage from "@/components/functional/shop/legal/LegalPage";
import LegalText from "@/components/functional/shop/legal/LegalText";
import { fill } from "@/core/locale/fill";
import { getMessages, localeAlternates, metadataLocale } from "@/core/locale/server";
import { getSiteSettings } from "@/core/modules/settings/service";
import { COMPANY } from "@/data/company";
import { TERMS_URL, TERMS_VERSION } from "@/data/checkout";

export async function generateMetadata({ params }: PageProps<"/[lang]/algemene-voorwaarden">): Promise<Metadata> {
  const { locale, messages } = await metadataLocale(params);
  return { title: messages.meta.terms, alternates: localeAlternates(locale, TERMS_URL) };
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
          deliveryTime: <DeliveryTime />,
        }}
      />
    </LegalPage>
  );
}
