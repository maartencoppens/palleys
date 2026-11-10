import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { LocaleProvider } from "@/core/locale/client";
import { hasLocale, LOCALES } from "@/core/locale/config";
import { clientMessages } from "@/core/locale/messages";
import { metadataLocale } from "@/core/locale/server";
import { siteUrl } from "@/core/seo/metadata";
import { THEME_COLOR } from "@/data/seo";
import { fontClassName, siteIcons } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

/*
 * What every shop page shares. Each page sets its own title, description, canonical and previews (core/seo/metadata.ts);
 * there is deliberately no canonical here, so a page that forgets one never claims to be the homepage.
 */
export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { messages } = await metadataLocale(params);
  return {
    metadataBase: new URL(siteUrl()),
    title: messages.meta.site.title,
    description: messages.meta.site.description,
    applicationName: messages.meta.siteName,
    authors: [{ name: messages.meta.siteName, url: siteUrl() }],
    creator: messages.meta.siteName,
    publisher: messages.meta.siteName,
    category: "shopping",
    icons: siteIcons,
    manifest: "/manifest.webmanifest",
    formatDetection: { telephone: false, email: false, address: false },
    robots: {
      index: true,
      follow: true,
      // Let search engines show large image previews and full snippets.
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    appleWebApp: { title: messages.meta.siteName, statusBarStyle: "default" },
  };
}

export const viewport: Viewport = { themeColor: THEME_COLOR };

/*
 * The shop's root layout: every page below it knows its language from the URL. src/proxy.ts sends /create here as
 * /nl/create, so visitors of the default language never see a prefix. The backoffice has a root layout of its own.
 */
export default async function ShopLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <html lang={lang} className={fontClassName} suppressHydrationWarning>
      <body>
        <LocaleProvider locale={lang} messages={clientMessages(lang)}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
