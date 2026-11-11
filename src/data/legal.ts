// The legal pages an admin manages in /admin/settings/legal (core/modules/legal). No server-only imports.
import { PRIVACY_URL, TERMS_URL, TERMS_VERSION } from "@/data/checkout";
import { CONTACT_DETAILS_URL } from "@/data/company";
import { RETURN_POLICY_URL } from "@/data/returns";
import { SHIPPING_POLICY_URL } from "@/data/shipping";

export const LEGAL_DOCUMENT_SLUGS = ["privacy", "terms", "returns", "shipping", "contact"] as const;
export type LegalDocumentSlug = (typeof LEGAL_DOCUMENT_SLUGS)[number];

/**
 * Per document: its page, the live values its text may use as {placeholder} (filled in on the page itself, see
 * components/functional/shop/legal), and the date of the text in src/core/locale/messages, which applies until the
 * first version is published. The terms' version there is TERMS_VERSION.
 */
export const LEGAL_DOCUMENTS: Record<
  LegalDocumentSlug,
  { label: string; path: string; placeholders: readonly string[]; fallbackDate: string; fallbackVersion: string }
> = {
  privacy: {
    label: "Privacybeleid",
    path: PRIVACY_URL,
    placeholders: ["email", "companyAddress"],
    fallbackDate: "2026-11-09",
    fallbackVersion: "2026-11-09",
  },
  terms: {
    label: "Algemene voorwaarden",
    path: TERMS_URL,
    placeholders: ["company", "email", "returnPolicy", "privacyPolicy"],
    fallbackDate: "2026-11-11",
    fallbackVersion: TERMS_VERSION,
  },
  returns: {
    label: "Retourbeleid",
    path: RETURN_POLICY_URL,
    placeholders: ["email", "returnAddress", "companyContact", "returnUrl", "terms"],
    fallbackDate: "2026-11-09",
    fallbackVersion: "2026-11-09",
  },
  shipping: {
    label: "Verzendbeleid",
    path: SHIPPING_POLICY_URL,
    placeholders: ["email", "deliveryPrices", "returnPolicy"],
    fallbackDate: "2026-11-09",
    fallbackVersion: "2026-11-09",
  },
  contact: {
    label: "Contactgegevens",
    path: CONTACT_DETAILS_URL,
    placeholders: ["name", "address", "email", "phone", "terms", "privacyPolicy", "returnPolicy", "shippingPolicy"],
    fallbackDate: "2026-11-09",
    fallbackVersion: "2026-11-09",
  },
};

/** What each placeholder becomes, for the editor. */
export const LEGAL_PLACEHOLDER_HELP: Record<string, string> = {
  email: "e-mailadres klantendienst (Bedrijf)",
  companyAddress: "bedrijfsnaam en adres (Bedrijf)",
  company: "bedrijfsnaam, adres, ondernemingsnummer en e-mail (Bedrijf)",
  companyContact: "bedrijfsnaam, adres en e-mail (Bedrijf)",
  returnAddress: "retouradres (Bedrijf)",
  name: "bedrijfsnaam (Bedrijf)",
  address: "adres (Bedrijf)",
  phone: "telefoonnummer (Bedrijf); een rij hiermee verdwijnt zonder nummer",
  deliveryPrices: "de verzendopties met hun prijs (Verzending)",
  returnUrl: "link naar palleys.be/retour",
  terms: "link naar de algemene voorwaarden",
  privacyPolicy: "link naar het privacybeleid",
  returnPolicy: "link naar het retourbeleid",
  shippingPolicy: "link naar het verzendbeleid",
};

export const LEGAL_LIMITS = {
  title: 160,
  intro: 1000,
  sections: 40,
  blocks: 40,
  paragraph: 4000,
  listItems: 40,
  listItem: 1000,
  tableColumns: 6,
  tableRows: 40,
  tableCell: 1000,
  contactRows: 30,
  contactLabel: 120,
  contactValue: 1000,
  seeAlso: 1000,
} as const;

// A legal page shows an older version with ?versie=... (the terms: the link in the order confirmation).
export const LEGAL_VERSION_PARAM = "versie";
