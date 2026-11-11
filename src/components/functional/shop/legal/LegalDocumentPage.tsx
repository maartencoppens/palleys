import { connection } from "next/server";
import { Suspense } from "react";
import LegalPage from "@/components/functional/shop/legal/LegalPage";
import LegalText from "@/components/functional/shop/legal/LegalText";
import { hasCompanyPhone, legalLinkClassName } from "@/components/functional/shop/legal/CompanyValue";
import { legalValues } from "@/components/functional/shop/legal/LegalValues";
import { Link } from "@/core/locale/client";
import { fill, fillNodes } from "@/core/locale/fill";
import { getLocale, getMessages } from "@/core/locale/server";
import { fallbackVersion } from "@/core/modules/legal/fallback";
import { getSiteLegalDocument } from "@/core/modules/legal/service";
import type { LegalContactDocument, LegalVersion } from "@/core/modules/legal/types";
import { formatDay } from "@/core/utils/format";
import { COMPANY } from "@/data/company";
import { LEGAL_DOCUMENTS, LEGAL_VERSION_PARAM, type LegalDocumentSlug } from "@/data/legal";

type Values = ReturnType<typeof legalValues>;

function ContactRows({ rows, values, phone }: { rows: LegalContactDocument["rows"]; values: Values; phone: boolean }) {
  // An empty phone number in the settings hides its row.
  const shown = phone ? rows : rows.filter((row) => !row.value.includes("{phone}"));
  return (
    <dl className="flex flex-col gap-4">
      {shown.map((row, index) => (
        <div key={index}>
          <dt className="font-label font-bold text-medium-green">{row.label}</dt>
          <dd>{fillNodes(row.value, values)}</dd>
        </div>
      ))}
    </dl>
  );
}

async function LiveContactRows({ rows, values }: { rows: LegalContactDocument["rows"]; values: Values }) {
  return <ContactRows rows={rows} values={values} phone={await hasCompanyPhone()} />;
}

async function DocumentView({ shown, current }: { shown: LegalVersion; current: LegalVersion }) {
  const [messages, locale] = await Promise.all([getMessages(), getLocale()]);
  const m = messages.legal;
  const slug = shown.document;
  const content = shown.content[locale];
  const values = legalValues(slug, messages);
  const date = formatDay(shown.effectiveDate, locale);
  const updated = slug === "terms" ? fill(m.versionUpdated, { version: shown.version, date }) : fill(m.updated, { date });
  const intro = [updated, content.intro].filter(Boolean).join(" ");

  return (
    <LegalPage eyebrow={m.eyebrow} title={content.title} intro={intro}>
      {shown.version !== current.version && (
        <p role="note" className="rounded-2xl bg-off-white-dark/60 px-5 py-4">
          {fillNodes(m.archived, {
            current: (
              <Link href={LEGAL_DOCUMENTS[slug].path} className={legalLinkClassName}>
                {m.currentVersion}
              </Link>
            ),
          })}
        </p>
      )}
      {"rows" in content ? (
        <>
          <Suspense fallback={<ContactRows rows={content.rows} values={values} phone={Boolean(COMPANY.phone)} />}>
            <LiveContactRows rows={content.rows} values={values} />
          </Suspense>
          {content.seeAlso && <p>{fillNodes(content.seeAlso, values)}</p>}
        </>
      ) : (
        <LegalText sections={content.sections} values={values} />
      )}
    </LegalPage>
  );
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function LiveDocument({ slug, searchParams }: { slug: LegalDocumentSlug; searchParams: SearchParams }) {
  await connection();
  const requested = (await searchParams)[LEGAL_VERSION_PARAM];
  const version = typeof requested === "string" ? requested.slice(0, 40) : undefined;
  const { shown, current } = await getSiteLegalDocument(slug, version);
  return <DocumentView shown={shown} current={current} />;
}

/**
 * A legal page with the version an admin published in /admin/settings/legal, or the text in the code until then (and
 * while it loads). ?versie=... shows an older version instead (the terms' link in an order confirmation).
 */
export default function LegalDocumentPage({ slug, searchParams }: { slug: LegalDocumentSlug; searchParams: SearchParams }) {
  const fallback = fallbackVersion(slug);
  return (
    <Suspense fallback={<DocumentView shown={fallback} current={fallback} />}>
      <LiveDocument slug={slug} searchParams={searchParams} />
    </Suspense>
  );
}
