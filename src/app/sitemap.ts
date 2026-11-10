import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { DEFAULT_LOCALE, LOCALES, localizedPath, type Locale } from "@/core/locale/config";
import { listCollectiblesForSitemap } from "@/core/modules/collectibles/service";
import { absoluteUrl } from "@/core/seo/metadata";
import { PRIVACY_URL, TERMS_URL } from "@/data/checkout";
import { CONTACT_DETAILS_URL } from "@/data/company";
import { RETURN_POLICY_URL } from "@/data/returns";
import { SHIPPING_POLICY_URL } from "@/data/shipping";

type Page = { path: string; changeFrequency: "weekly" | "monthly" | "yearly"; priority: number; lastModified?: Date; images?: string[] };

const PAGES: Page[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/create", changeFrequency: "weekly", priority: 0.9 },
  { path: "/shop", changeFrequency: "weekly", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: SHIPPING_POLICY_URL, changeFrequency: "yearly", priority: 0.3 },
  { path: RETURN_POLICY_URL, changeFrequency: "yearly", priority: 0.3 },
  { path: TERMS_URL, changeFrequency: "yearly", priority: 0.2 },
  { path: PRIVACY_URL, changeFrequency: "yearly", priority: 0.2 },
  { path: CONTACT_DETAILS_URL, changeFrequency: "yearly", priority: 0.2 },
];

const url = (path: string, locale: Locale) => absoluteUrl(localizedPath(path, locale));

/** Every page in the default language, with its translation, and every product page with its photo. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Read per request: a product put online shows up without a new build.
  await connection();
  const products: Page[] = await listCollectiblesForSitemap()
    .then((rows) =>
      rows.map((row) => ({
        path: `/shop/${row.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
        lastModified: row.updatedAt,
        images: row.imageUrl ? [absoluteUrl(row.imageUrl)] : [],
      })),
    )
    // Without the database the shop pages still go out; the products come back on the next fetch.
    .catch((error) => {
      console.error("[sitemap] products could not be loaded:", error instanceof Error ? error.message : error);
      return [];
    });

  return [...PAGES, ...products].map(({ path, changeFrequency, priority, lastModified, images }) => ({
    url: url(path, DEFAULT_LOCALE),
    changeFrequency,
    priority,
    ...(lastModified && { lastModified }),
    ...(images?.length && { images }),
    alternates: { languages: Object.fromEntries(LOCALES.map((locale) => [locale, url(path, locale)])) },
  }));
}
