import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import LegalPage from "@/components/functional/shop/legal/LegalPage";
import { Link } from "@/core/locale/client";
import { fillNodes } from "@/core/locale/fill";
import { getMessages, metadataLocale } from "@/core/locale/server";
import { getSiteSettings } from "@/core/modules/settings/service";
import { PRIVACY_URL, TERMS_URL } from "@/data/checkout";
import { COMPANY, CONTACT_DETAILS_URL } from "@/data/company";
import { RETURN_POLICY_URL } from "@/data/returns";
import { SHIPPING_POLICY_URL } from "@/data/shipping";
import type { CompanySettings } from "@/core/modules/settings/types";
import { pageMetadata } from "@/core/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/[lang]/contactgegevens">): Promise<Metadata> {
  const { locale, messages } = await metadataLocale(params);
  const m = messages.meta.contactDetails;
  return pageMetadata({ locale, path: CONTACT_DETAILS_URL, title: m.title, description: m.description });
}

const linkClassName = "font-semibold text-medium-green underline underline-offset-2";
type Company = Pick<CompanySettings, "legalName" | "address" | "email" | "phone">;

async function Details({ company }: { company: Company }) {
  const { legal } = await getMessages();
  const m = legal.contactDetails;
  const mail = (
    <a href={`mailto:${company.email}`} className={linkClassName}>
      {company.email}
    </a>
  );
  // An empty phone number in the settings hides the row.
  const phone = company.phone && (
    <a href={`tel:${company.phone.replace(/[^+\d]/g, "")}`} className={linkClassName}>
      {company.phone}
    </a>
  );
  const rows: [string, ReactNode][] = [
    [m.tradeName, company.legalName],
    [m.capacity, m.capacityText],
    [m.vat, m.vatText],
    [m.address, company.address],
    [m.email, mail],
    ...(phone ? [[m.phone, phone] as [string, ReactNode]] : []),
    [
      m.controller,
      fillNodes(m.controllerText, {
        name: company.legalName,
        privacyPolicy: (
          <Link href={PRIVACY_URL} className={linkClassName}>
            {m.privacyLink}
          </Link>
        ),
      }),
    ],
    [m.complaints, fillNodes(m.complaintsText, { email: mail })],
  ];
  return (
    <dl className="flex flex-col gap-4">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="font-label font-bold text-medium-green">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

async function LiveDetails() {
  await connection();
  const { company } = await getSiteSettings();
  return <Details company={company} />;
}

// LEGAL-REVIEW: the legally required company details; name, address, e-mail and phone come from the company settings.
export default async function ContactDetailsPage() {
  const { legal } = await getMessages();
  const m = legal.contactDetails;
  const link = (href: string, label: string) => (
    <Link href={href} className={linkClassName}>
      {label}
    </Link>
  );
  return (
    <LegalPage eyebrow={legal.eyebrow} title={m.title} intro={m.intro}>
      <Suspense fallback={<Details company={COMPANY} />}>
        <LiveDetails />
      </Suspense>
      <p>
        {fillNodes(m.seeAlso, {
          terms: link(TERMS_URL, m.termsLink),
          privacy: link(PRIVACY_URL, m.privacyLink),
          returnPolicy: link(RETURN_POLICY_URL, legal.terms.returnPolicyLink),
          shippingPolicy: link(SHIPPING_POLICY_URL, m.shippingPolicyLink),
        })}
      </p>
    </LegalPage>
  );
}
