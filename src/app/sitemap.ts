import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, LOCALES, localizedPath } from "@/core/locale/config";

const siteUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);

const PAGES: { path: string; changeFrequency: "weekly" | "monthly"; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/about", changeFrequency: "monthly", priority: 0.8 },
  { path: "/shop", changeFrequency: "weekly", priority: 0.9 },
  { path: "/create", changeFrequency: "weekly", priority: 0.9 },
];

const url = (path: string, locale: (typeof LOCALES)[number]) => `${siteUrl}${localizedPath(path, locale)}`.replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(({ path, changeFrequency, priority }) => ({
    url: url(path, DEFAULT_LOCALE),
    changeFrequency,
    priority,
    alternates: { languages: Object.fromEntries(LOCALES.map((locale) => [locale, url(path, locale)])) },
  }));
}
