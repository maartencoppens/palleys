import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocaleProvider } from "@/core/locale/client";
import { hasLocale, LOCALES } from "@/core/locale/config";
import { clientMessages } from "@/core/locale/messages";
import { localeAlternates, metadataLocale } from "@/core/locale/server";
import { fontClassName, siteIcons } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { locale, messages } = await metadataLocale(params);
  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    title: messages.meta.site.title,
    description: messages.meta.site.description,
    icons: siteIcons,
    alternates: localeAlternates(locale, "/"),
  };
}

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
