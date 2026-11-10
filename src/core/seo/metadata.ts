import type { Metadata } from "next";
import { LOCALES, localizedPath, type Locale } from "@/core/locale/config";
import { MESSAGES } from "@/core/locale/messages";
import { localeAlternates } from "@/core/locale/server";
import { OG_IMAGE_SIZE, ogImagePath, OG_LOCALES } from "@/data/seo";

/*
 * Metadata for a shop page: title, description, keywords, canonical with its translations, and the Open Graph and
 * Twitter previews shown when a link is shared. Every indexable page builds its metadata here, so none of them can
 * fall back to the homepage's canonical (which tells search engines the page is a copy of the homepage).
 */

/** The site's own address, without a trailing slash. Relative URLs in metadata resolve against it (metadataBase). */
export const siteUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const absoluteUrl = (path: string) => `${siteUrl()}${path === "/" ? "" : path}`;

type PageMetadataInput = {
  locale: Locale;
  /** The page's path in the default language, e.g. "/shop". */
  path: string;
  title: string;
  description: string;
  /** Added to the site-wide keywords. */
  keywords?: readonly string[];
  /** The preview image; the branded site image when left out. */
  image?: { url: string; alt: string };
  /** Extra <meta> tags, e.g. a product's price. */
  other?: Metadata["other"];
};

export function pageMetadata({ locale, path, title, description, keywords = [], image, other }: PageMetadataInput): Metadata {
  const meta = MESSAGES[locale].meta;
  const alternates = localeAlternates(locale, path);
  const preview = { ...OG_IMAGE_SIZE, type: "image/png", ...(image ?? { url: ogImagePath(locale), alt: meta.og.imageAlt }) };
  return {
    title: { absolute: title },
    description,
    keywords: [...new Set([...meta.keywords, ...keywords])],
    alternates,
    openGraph: {
      type: "website",
      siteName: meta.siteName,
      title,
      description,
      url: localizedPath(path, locale),
      locale: OG_LOCALES[locale],
      alternateLocale: LOCALES.filter((item) => item !== locale).map((item) => OG_LOCALES[item]),
      images: [preview],
    },
    twitter: { card: "summary_large_image", title, description, images: [preview] },
    ...(other && { other }),
  };
}
