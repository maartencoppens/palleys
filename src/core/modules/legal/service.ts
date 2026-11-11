import "server-only";
import { cache } from "react";
import { prisma } from "@/db/client";
import { Prisma, type LegalDocumentVersion } from "@/db/generated/client";
import { LEGAL_DOCUMENTS } from "@/data/legal";
import { fallbackVersion } from "./fallback";
import {
  belgianDay,
  LEGAL_DOCUMENT_KINDS,
  legalContentSchema,
  nextVersionName,
  sameContent,
  type LegalDocumentSlug,
  type LegalVersion,
  type LegalVersionSummary,
  type LocalizedLegalContent,
} from "./types";

/*
 * The legal pages (privacy, terms, return, shipping and contact details). Every publication is a new row that never
 * changes, so an order's termsVersion keeps pointing at the text the customer accepted. Without a published version
 * the text in src/core/locale/messages applies. Every publication is logged in AdminAuditLog.
 */

export const LEGAL_AUDIT_ACTION = "legal.publish";

export class LegalPublishError extends Error {}

const LATEST_ROWS = 10;

function toVersion<D extends LegalDocumentSlug>(slug: D, row: LegalDocumentVersion): LegalVersion<D> | null {
  const content = legalContentSchema(slug).safeParse(row.content);
  if (!content.success) {
    console.error(`[legal] version ${row.version} of ${slug} no longer fits its schema, skipped`);
    return null;
  }
  return {
    document: slug,
    version: row.version,
    effectiveDate: row.effectiveDate.toISOString().slice(0, 10),
    content: content.data as LocalizedLegalContent<D>,
    publishedBy: row.publishedBy,
    publishedAt: row.createdAt.toISOString(),
    published: true,
  };
}

/** The version that applies now: the latest that still fits its schema, else the text in the code. */
export async function getCurrentLegalVersion<D extends LegalDocumentSlug>(slug: D): Promise<LegalVersion<D>> {
  const rows = await prisma.legalDocumentVersion.findMany({
    where: { document: LEGAL_DOCUMENT_KINDS[slug] },
    orderBy: { createdAt: "desc" },
    take: LATEST_ROWS,
  });
  for (const row of rows) {
    const version = toVersion(slug, row);
    if (version) return version;
  }
  return fallbackVersion(slug);
}

/** A version by its name, also an older one; null when it doesn't exist. */
export async function getLegalVersion<D extends LegalDocumentSlug>(slug: D, version: string): Promise<LegalVersion<D> | null> {
  const row = await prisma.legalDocumentVersion.findUnique({
    where: { document_version: { document: LEGAL_DOCUMENT_KINDS[slug], version } },
  });
  if (row) return toVersion(slug, row);
  return version === LEGAL_DOCUMENTS[slug].fallbackVersion ? fallbackVersion(slug) : null;
}

/** The version of the terms a customer accepts at checkout. */
export async function getCurrentTermsVersion() {
  return (await getCurrentLegalVersion("terms")).version;
}

/**
 * For the shop's pages: once per request, and never the reason a page fails. If the database can't be reached, the
 * text in the code shows. `version` = an older one (?versie=...); unknown, the current one.
 */
export const getSiteLegalDocument = cache(
  async <D extends LegalDocumentSlug>(slug: D, version?: string): Promise<{ shown: LegalVersion<D>; current: LegalVersion<D> }> => {
    try {
      const current = await getCurrentLegalVersion(slug);
      const older = version && version !== current.version ? await getLegalVersion(slug, version) : null;
      return { shown: older ?? current, current };
    } catch (error) {
      console.error("[legal] could not be loaded:", error instanceof Error ? error.message : error);
      const fallback = fallbackVersion(slug);
      return { shown: fallback, current: fallback };
    }
  },
);

/** Every version of a document, newest first; the text in the code last. */
export async function listLegalVersions(slug: LegalDocumentSlug): Promise<LegalVersionSummary[]> {
  const rows = await prisma.legalDocumentVersion.findMany({
    where: { document: LEGAL_DOCUMENT_KINDS[slug] },
    orderBy: { createdAt: "desc" },
    select: { version: true, effectiveDate: true, publishedBy: true, createdAt: true },
  });
  const code = fallbackVersion(slug);
  return [
    ...rows.map((row) => ({
      document: slug,
      version: row.version,
      effectiveDate: row.effectiveDate.toISOString().slice(0, 10),
      publishedBy: row.publishedBy,
      publishedAt: row.createdAt.toISOString(),
      published: true,
    })),
    {
      document: slug,
      version: code.version,
      effectiveDate: code.effectiveDate,
      publishedBy: null,
      publishedAt: null,
      published: false,
    },
  ];
}

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

/** Publishes new texts as the next version, from today; the shop shows them at once. */
export async function publishLegalDocument<D extends LegalDocumentSlug>(
  slug: D,
  raw: LocalizedLegalContent<D>,
  adminName: string,
  now = new Date(),
): Promise<LegalVersion<D>> {
  const content = legalContentSchema(slug).parse(raw) as LocalizedLegalContent<D>;
  const current = await getCurrentLegalVersion(slug);
  if (sameContent(current.content, content)) throw new LegalPublishError("Er is niets gewijzigd ten opzichte van de huidige versie");

  const day = belgianDay(now);
  const document = LEGAL_DOCUMENT_KINDS[slug];
  // Two admins publishing on the same day both want -2: the one who loses tries the next name.
  for (let attempt = 0; attempt < 3; attempt++) {
    const taken = await prisma.legalDocumentVersion.findMany({
      where: { document, version: { startsWith: day } },
      select: { version: true },
    });
    const version = nextVersionName(day, [...taken.map((row) => row.version), LEGAL_DOCUMENTS[slug].fallbackVersion]);
    try {
      const [row] = await prisma.$transaction([
        prisma.legalDocumentVersion.create({
          data: { document, version, effectiveDate: new Date(`${day}T00:00:00Z`), content, publishedBy: adminName },
        }),
        prisma.adminAuditLog.create({
          data: { actor: adminName, action: LEGAL_AUDIT_ACTION, subject: slug, fromValue: current.version, toValue: version },
        }),
      ]);
      console.info(`[legal] ${adminName}: ${slug} ${current.version} → ${version}`);
      return toVersion(slug, row)!;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new LegalPublishError("Iemand anders publiceerde tegelijk; probeer opnieuw");
}
