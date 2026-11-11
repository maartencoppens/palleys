import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/core/modules/auth/service";
import { getCurrentLegalVersion, listLegalVersions } from "@/core/modules/legal/service";
import { isLegalDocumentSlug } from "@/core/modules/legal/types";
import { LEGAL_DOCUMENTS } from "@/data/legal";
import { LegalDocumentForm } from "@/components/functional/admin/settings/LegalDocumentForm";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";

export const instant = false;

const linkClassName =
  "w-fit rounded font-label text-base font-bold text-medium-green underline underline-offset-4 transition-colors hover:text-orange";

export default async function AdminLegalDocumentPage({ params }: PageProps<"/admin/settings/legal/[document]">) {
  await requireAdminPage();
  const { document: slug } = await params;
  if (!isLegalDocumentSlug(slug)) notFound();
  const [current, versions] = await Promise.all([getCurrentLegalVersion(slug), listLegalVersions(slug)]);
  const { label, path } = LEGAL_DOCUMENTS[slug];
  return (
    <>
      <Link href="/admin/settings/legal" className={linkClassName}>
        Terug naar juridisch
      </Link>
      <SettingsHeader
        title={label}
        intro={`Nu geldt versie ${current.version}.${slug === "terms" ? " Elke bestelling bewaart de versie die de klant aanvaardde." : ""}`}
        action={
          <a href={path} target="_blank" rel="noreferrer" className={linkClassName}>
            Bekijken op de website
          </a>
        }
      />
      {/* A new key after publishing: the form starts again from the version that now applies. */}
      <LegalDocumentForm key={current.version} slug={slug} content={current.content} currentVersion={current.version} versions={versions} />
    </>
  );
}
