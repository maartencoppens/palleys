import type { Locale } from "@/core/locale/config";
import { INTL_LOCALES, localizedPath } from "@/core/locale/config";
import { MESSAGES } from "@/core/locale/messages";
import type { CompanySettings } from "@/core/modules/settings/types";
import { absoluteUrl, siteUrl } from "./metadata";

/* schema.org objects for JsonLd. Ids tie them together: every product and page points at the one organisation. */

const organizationId = () => `${siteUrl()}/#organization`;
const websiteId = () => `${siteUrl()}/#website`;

/** Palleys itself, with its logo, contact and social profiles. */
export function organizationData(company: CompanySettings, locale: Locale) {
  const meta = MESSAGES[locale].meta;
  return {
    "@type": "Organization",
    "@id": organizationId(),
    name: meta.siteName,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icons/icon-512.png"),
    image: absoluteUrl("/images/cta/golden-retriever.jpg"),
    description: meta.site.description,
    slogan: "A pal for your keys",
    email: company.email,
    ...(company.phone && { telephone: company.phone }),
    address: { "@type": "PostalAddress", streetAddress: company.address, addressLocality: "Gent", addressCountry: "BE" },
    areaServed: "BE",
    sameAs: Object.values(company.socials).filter(Boolean),
  };
}

export function websiteData(locale: Locale) {
  const meta = MESSAGES[locale].meta;
  return {
    "@type": "WebSite",
    "@id": websiteId(),
    name: meta.siteName,
    url: absoluteUrl(localizedPath("/", locale)),
    inLanguage: INTL_LOCALES[locale],
    publisher: { "@id": organizationId() },
  };
}

export function faqData(faq: { question: string; answer: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/** Home > … > the page, by name and path. */
export function breadcrumbData(locale: Locale, items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(localizedPath(item.path, locale)),
    })),
  };
}

type ProductInput = {
  locale: Locale;
  name: string;
  description: string;
  path: string;
  image: string | null;
  sku?: string | null;
  /** One price, or the range of a Palley op maat (keychain and figurine). */
  priceCents: number | { low: number; high: number };
  availability: "InStock" | "OutOfStock";
  /** A collectible may be returned within 14 days; a Palley op maat is made for you and can't (art. VI.53, 3° WER). */
  returnable: boolean;
};

export function productData({ locale, name, description, path, image, sku, priceCents, availability, returnable }: ProductInput) {
  const url = absoluteUrl(localizedPath(path, locale));
  const euro = (cents: number) => (cents / 100).toFixed(2);
  const shared = {
    priceCurrency: "EUR",
    availability: `https://schema.org/${availability}`,
    itemCondition: "https://schema.org/NewCondition",
    url,
    seller: { "@id": organizationId() },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "BE",
      ...(returnable
        ? {
            returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
            merchantReturnDays: 14,
            returnMethod: "https://schema.org/ReturnByMail",
          }
        : { returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted" }),
    },
  };
  return {
    "@type": "Product",
    name,
    description,
    url,
    ...(image && { image: absoluteUrl(image) }),
    ...(sku && { sku }),
    brand: { "@type": "Brand", name: MESSAGES[locale].meta.siteName },
    manufacturer: { "@id": organizationId() },
    material: "Full-colour resin (3D print)",
    offers:
      typeof priceCents === "number"
        ? { "@type": "Offer", price: euro(priceCents), ...shared }
        : { "@type": "AggregateOffer", lowPrice: euro(priceCents.low), highPrice: euro(priceCents.high), offerCount: 2, ...shared },
  };
}
