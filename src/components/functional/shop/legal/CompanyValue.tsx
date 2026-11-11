import { connection } from "next/server";
import { Suspense } from "react";
import { getSiteSettings } from "@/core/modules/settings/service";
import { COMPANY } from "@/data/company";
import type { CompanySettings } from "@/core/modules/settings/types";

type Field = "email" | "returnAddress" | "contact" | "nameAddress" | "legalName" | "address" | "phone";
type Company = Pick<CompanySettings, "legalName" | "address" | "email" | "returnAddress" | "phone">;

export const legalLinkClassName = "font-semibold text-medium-green underline underline-offset-2";

function read(company: Company, field: Field) {
  if (field === "contact") return [company.legalName, company.address, company.email].join(", ");
  if (field === "nameAddress") return `${company.legalName}, ${company.address}`;
  // LEGAL-REVIEW: no return address in the settings: the company's own address, never an empty sentence.
  if (field === "returnAddress") return company.returnAddress || company.address;
  return company[field];
}

function Value({ company, field, link }: { company: Company; field: Field; link: boolean }) {
  const value = read(company, field);
  if (!link || !value || (field !== "email" && field !== "phone")) return value;
  const href = field === "email" ? `mailto:${value}` : `tel:${value.replace(/[^+\d]/g, "")}`;
  return (
    <a href={href} className={legalLinkClassName}>
      {value}
    </a>
  );
}

async function Live({ field, link }: { field: Field; link: boolean }) {
  await connection();
  const { company } = await getSiteSettings();
  return <Value company={company} field={field} link={link} />;
}

/* A company detail inside a legal text, live from /admin/settings/company; the starting value while it loads. */
export default function CompanyValue({ field, link = false }: { field: Field; link?: boolean }) {
  return (
    <Suspense fallback={<Value company={COMPANY} field={field} link={link} />}>
      <Live field={field} link={link} />
    </Suspense>
  );
}

/** Whether the company has a phone number, live; a contact row with {phone} disappears without one. */
export async function hasCompanyPhone() {
  await connection();
  const { company } = await getSiteSettings();
  return Boolean(company.phone);
}
