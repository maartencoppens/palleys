import { LOCALES } from "@/core/locale/config";
import { MESSAGES } from "@/core/locale/messages";
import { LEGAL_DOCUMENTS, type LegalDocumentSlug } from "@/data/legal";
import type { LegalBlock, LegalContactDocument, LegalSectionsDocument, LegalVersion, LocalizedLegalContent } from "./types";

/* The legal texts in src/core/locale/messages, which apply until an admin publishes a version. No server-only imports. */

const paragraphs = (blocks: readonly (string | readonly string[] | { head: readonly string[]; rows: readonly (readonly string[])[] })[]) =>
  blocks.map((block): LegalBlock => {
    if (typeof block === "string") return { type: "paragraph", text: block };
    if ("head" in block) return { type: "table", head: [...block.head], rows: block.rows.map((row) => [...row]) };
    return { type: "list", items: [...block] };
  });

/** The text in src/core/locale/messages, in the shape of a version: what applies until the first publication. */
export function fallbackContent<D extends LegalDocumentSlug>(slug: D): LocalizedLegalContent<D> {
  return Object.fromEntries(
    LOCALES.map((locale) => {
      const { legal } = MESSAGES[locale];
      if (slug === "contact") {
        const m = legal.contactDetails;
        const content: LegalContactDocument = {
          title: m.title,
          intro: "",
          rows: [
            { label: m.tradeName, value: "{name}" },
            { label: m.capacity, value: m.capacityText },
            { label: m.vat, value: m.vatText },
            { label: m.address, value: "{address}" },
            { label: m.email, value: "{email}" },
            { label: m.phone, value: "{phone}" },
            { label: m.controller, value: m.controllerText },
            { label: m.complaints, value: m.complaintsText },
          ],
          seeAlso: m.seeAlso,
        };
        return [locale, content];
      }
      const m = { privacy: legal.privacy, terms: legal.terms, returns: legal.returnPolicy, shipping: legal.shippingPolicy }[
        slug as Exclude<LegalDocumentSlug, "contact">
      ];
      const content: LegalSectionsDocument = {
        title: m.title,
        intro: "intro" in m ? m.intro : "",
        sections: m.sections.map((section) => ({ title: section.title, blocks: paragraphs(section.blocks) })),
      };
      return [locale, content];
    }),
  ) as LocalizedLegalContent<D>;
}

export function fallbackVersion<D extends LegalDocumentSlug>(slug: D): LegalVersion<D> {
  const { fallbackVersion: version, fallbackDate } = LEGAL_DOCUMENTS[slug];
  return {
    document: slug,
    version,
    effectiveDate: fallbackDate,
    content: fallbackContent(slug),
    publishedBy: null,
    publishedAt: null,
    published: false,
  };
}
