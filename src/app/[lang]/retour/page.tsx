import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import LegalPage from "@/components/functional/shop/legal/LegalPage";
import ReturnPortal from "@/components/functional/shop/returns/ReturnPortal";
import { fill, fillNodes } from "@/core/locale/fill";
import { Link } from "@/core/locale/client";
import { getMessages, localeAlternates, metadataLocale } from "@/core/locale/server";
import { getSiteSettings } from "@/core/modules/settings/service";
import { COMPANY } from "@/data/company";
import { RETURN_POLICY_URL, RETURN_URL } from "@/data/returns";

export async function generateMetadata({ params }: PageProps<"/[lang]/retour">): Promise<Metadata> {
  const { locale, messages } = await metadataLocale(params);
  return {
    title: messages.meta.returns,
    alternates: localeAlternates(locale, RETURN_URL),
    // The link from the mail carries a token (in the fragment, but just in case): never pass the address on.
    referrer: "no-referrer",
  };
}

async function LivePortal() {
  await connection();
  const { company } = await getSiteSettings();
  return <ReturnPortal companyEmail={company.email} />;
}

async function LiveMailLine({ text }: { text: string }) {
  await connection();
  const { company } = await getSiteSettings();
  return fill(text, { email: company.email });
}

// LEGAL-REVIEW: the online withdrawal function (Richtlijn (EU) 2023/2673) and the summary of the return policy.
export default async function ReturnsPage() {
  const { returns: m, common, legal } = await getMessages();
  return (
    <LegalPage eyebrow={m.eyebrow} title={m.title} intro={m.intro}>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-white" role="status" aria-label={common.loading} />}>
        <LivePortal />
      </Suspense>
      <section aria-labelledby="return-policy-title">
        <h2 id="return-policy-title">{m.policy.title}</h2>
        <ul>
          {m.policy.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-4">
          <Suspense fallback={fill(m.policy.mail, { email: COMPANY.email })}>
            <LiveMailLine text={m.policy.mail} />
          </Suspense>
        </p>
        <p className="mt-4">
          {fillNodes(m.policy.full, {
            policy: (
              <Link href={RETURN_POLICY_URL} className="font-semibold text-medium-green underline underline-offset-2">
                {legal.terms.returnPolicyLink}
              </Link>
            ),
          })}
        </p>
      </section>
    </LegalPage>
  );
}
