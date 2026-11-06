import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import LegalPage from "@/components/functional/shop/legal/LegalPage";
import LegalText from "@/components/functional/shop/legal/LegalText";
import { getMessages, localeAlternates, metadataLocale } from "@/core/locale/server";
import { getSiteSettings } from "@/core/modules/settings/service";
import { COMPANY } from "@/data/company";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { locale, messages } = await metadataLocale(params);
  return { title: messages.meta.privacy, alternates: localeAlternates(locale, "/privacy") };
}

async function LiveCompanyEmail() {
  await connection();
  const { company } = await getSiteSettings();
  return company.email;
}

export default async function PrivacyPage() {
  const { legal: m } = await getMessages();
  return (
    <LegalPage eyebrow={m.eyebrow} title={m.privacy.title} intro={m.privacy.intro}>
      <LegalText
        sections={m.privacy.sections}
        values={{
          email: (
            <Suspense fallback={COMPANY.email}>
              <LiveCompanyEmail />
            </Suspense>
          ),
        }}
      />
    </LegalPage>
  );
}
