import { z } from "zod";
import { LOCALES, type Locale } from "@/core/locale/config";
import { LEGAL_DOCUMENT_SLUGS, LEGAL_DOCUMENTS, LEGAL_LIMITS as L, type LegalDocumentSlug } from "@/data/legal";

/*
 * The legal pages as an admin edits them: one version holds the text in every language. Most documents are sections of
 * blocks (a paragraph, a bulleted list or a table); the contact details are labelled rows. A text may use the
 * document's placeholders ({email}, {returnPolicy}...), which the page fills in live. No server-only imports.
 */

export { LEGAL_DOCUMENT_SLUGS, type LegalDocumentSlug };

export const LEGAL_DOCUMENT_KINDS = {
  privacy: "PRIVACY",
  terms: "TERMS",
  returns: "RETURNS",
  shipping: "SHIPPING",
  contact: "CONTACT",
} as const satisfies Record<LegalDocumentSlug, string>;

export type LegalDocumentKind = (typeof LEGAL_DOCUMENT_KINDS)[LegalDocumentSlug];

export const isLegalDocumentSlug = (value: string): value is LegalDocumentSlug =>
  (LEGAL_DOCUMENT_SLUGS as readonly string[]).includes(value);

const text = (max: number) => z.string().trim().min(1, "Mag niet leeg zijn").max(max);

const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: text(L.paragraph) }),
  z.object({ type: z.literal("list"), items: z.array(text(L.listItem)).min(1).max(L.listItems) }),
  z
    .object({
      type: z.literal("table"),
      head: z.array(text(L.tableCell)).min(1).max(L.tableColumns),
      rows: z.array(z.array(z.string().trim().max(L.tableCell))).min(1).max(L.tableRows),
    })
    .refine((table) => table.rows.every((row) => row.length === table.head.length), {
      message: "Elke rij heeft evenveel cellen als de kop",
      path: ["rows"],
    }),
]);

export const legalSectionSchema = z.object({
  title: text(L.title),
  blocks: z.array(blockSchema).min(1).max(L.blocks),
});

export const legalSectionsDocumentSchema = z.object({
  title: text(L.title),
  intro: z.string().trim().max(L.intro),
  sections: z.array(legalSectionSchema).min(1).max(L.sections),
});

export const legalContactDocumentSchema = z.object({
  title: text(L.title),
  intro: z.string().trim().max(L.intro),
  rows: z
    .array(z.object({ label: text(L.contactLabel), value: text(L.contactValue) }))
    .min(1)
    .max(L.contactRows),
  seeAlso: z.string().trim().max(L.seeAlso),
});

export type LegalBlock = z.infer<typeof blockSchema>;
export type LegalSection = z.infer<typeof legalSectionSchema>;
export type LegalSectionsDocument = z.infer<typeof legalSectionsDocumentSchema>;
export type LegalContactDocument = z.infer<typeof legalContactDocumentSchema>;

export type LegalDocumentContent<D extends LegalDocumentSlug = LegalDocumentSlug> = D extends "contact"
  ? LegalContactDocument
  : LegalSectionsDocument;
export type LocalizedLegalContent<D extends LegalDocumentSlug = LegalDocumentSlug> = Record<Locale, LegalDocumentContent<D>>;

const PLACEHOLDER = /\{(\w+)\}/g;

export const placeholdersIn = (value: string) => [...value.matchAll(PLACEHOLDER)].map((match) => match[1]);

/** Every text in a document with its path, to check its placeholders. */
function texts(value: unknown, path: (string | number)[] = []): [string, (string | number)[]][] {
  if (typeof value === "string") return [[value, path]];
  if (Array.isArray(value)) return value.flatMap((item, index) => texts(item, [...path, index]));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([key, item]) => (key === "type" ? [] : texts(item, [...path, key])));
  return [];
}

/** The schema of a document in every language; a placeholder the page can't fill in is refused. */
export function legalContentSchema(slug: LegalDocumentSlug) {
  const allowed = LEGAL_DOCUMENTS[slug].placeholders;
  const document = slug === "contact" ? legalContactDocumentSchema : legalSectionsDocumentSchema;
  return z
    .object(Object.fromEntries(LOCALES.map((locale) => [locale, document])) as Record<Locale, typeof document>)
    .superRefine((content, ctx) => {
      for (const [value, path] of texts(content)) {
        for (const name of placeholdersIn(value)) {
          if (!allowed.includes(name))
            ctx.addIssue({
              code: "custom",
              path,
              message: `{${name}} bestaat niet in dit document (wel: ${allowed.map((item) => `{${item}}`).join(", ")})`,
            });
        }
      }
    }) as unknown as z.ZodType<LocalizedLegalContent>;
}

export const publishLegalDocumentSchema = (slug: LegalDocumentSlug) => z.object({ content: legalContentSchema(slug) });

/** One published version, as the shop and the backoffice read it. `published: false` = the text in the code. */
export type LegalVersion<D extends LegalDocumentSlug = LegalDocumentSlug> = {
  document: D;
  version: string;
  effectiveDate: string; // 2026-11-11
  content: LocalizedLegalContent<D>;
  publishedBy: string | null;
  publishedAt: string | null;
  published: boolean;
};

export type LegalVersionSummary = Omit<LegalVersion, "content">;

/** The name of a new version: the day, and -2, -3... when that day already has one. */
export function nextVersionName(day: string, existing: readonly string[]) {
  if (!existing.includes(day)) return day;
  let number = 2;
  while (existing.includes(`${day}-${number}`)) number++;
  return `${day}-${number}`;
}

/** Today in Belgium, as 2026-11-11. */
export function belgianDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** The same texts, ignoring whitespace at the ends: publishing nothing new is refused. */
export function sameContent(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}
