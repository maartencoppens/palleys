import { connection } from "next/server";
import { Suspense } from "react";
import { getSiteSettings } from "@/core/modules/settings/service";
import { COMPANY } from "@/data/company";
import type { CompanySettings } from "@/core/modules/settings/types";

type Field = "email" | "returnAddress" | "contact" | "nameAddress";

function read(company: Pick<CompanySettings, "legalName" | "address" | "email" | "returnAddress">, field: Field) {
  if (field === "contact") return [company.legalName, company.address, company.email].join(", ");
  if (field === "nameAddress") return `${company.legalName}, ${company.address}`;
  // LEGAL-REVIEW: no return address in the settings: the company's own address, never an empty sentence.
  if (field === "returnAddress") return company.returnAddress || company.address;
  return company[field];
}

async function Live({ field }: { field: Field }) {
  await connection();
  const { company } = await getSiteSettings();
  return read(company, field);
}

/* A company detail inside a legal text, live from /admin/settings/company; the starting value while it loads. */
export default function CompanyValue({ field }: { field: Field }) {
  return (
    <Suspense fallback={read(COMPANY, field)}>
      <Live field={field} />
    </Suspense>
  );
}
