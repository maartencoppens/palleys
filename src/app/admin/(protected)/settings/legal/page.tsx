import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { getCurrentLegalVersion } from "@/core/modules/legal/service";
import { LEGAL_DOCUMENT_SLUGS } from "@/core/modules/legal/types";
import { formatDateTime, formatDay } from "@/core/utils/format";
import { LEGAL_DOCUMENTS } from "@/data/legal";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";

export const instant = false;

export default async function AdminLegalSettingsPage() {
  await requireAdminPage();
  const versions = await Promise.all(LEGAL_DOCUMENT_SLUGS.map((slug) => getCurrentLegalVersion(slug)));
  return (
    <>
      <SettingsHeader
        title="Juridisch"
        intro="De juridische pagina’s in elke taal. Publiceren maakt een nieuwe versie die meteen geldt; oudere versies blijven bewaard."
      />
      <ul className="flex flex-col gap-3">
        {versions.map((version) => {
          const document = LEGAL_DOCUMENTS[version.document];
          return (
            <li key={version.document}>
              <Link
                href={`/admin/settings/legal/${version.document}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-5 transition-colors hover:bg-off-white md:px-8"
              >
                <span className="font-display text-xl font-medium text-medium-green">{document.label}</span>
                <span className="text-sm text-text-muted">
                  {version.published && version.publishedAt
                    ? `Versie ${version.version} · ${version.publishedBy}, ${formatDateTime(version.publishedAt)}`
                    : `Starttekst uit de code (${formatDay(version.effectiveDate)})`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
