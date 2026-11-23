import { connection } from "next/server";
import { DEFAULT_LOCALE, hasLocale } from "@/core/locale/config";
import { listPublishedCollectibles } from "@/core/modules/collectibles/service";
import { getShopSettings } from "@/core/modules/settings/service";
import { merchantFeedXml } from "@/core/seo/merchant-feed";
import { siteUrl } from "@/core/seo/metadata";

/*
 * /feeds/google-merchant.xml: the product feed Google Merchant Center fetches every day. Dutch by default,
 * ?lang=en for English (a second source in Merchant Center). Read per request, so a product put online is in the next fetch.
 */
export async function GET(request: Request) {
  await connection();
  const lang = new URL(request.url).searchParams.get("lang");
  if (lang !== null && !hasLocale(lang)) return new Response("Unknown language", { status: 404 });
  const locale = lang ?? DEFAULT_LOCALE;

  try {
    const [collectibles, settings] = await Promise.all([listPublishedCollectibles(locale), getShopSettings()]);
    const xml = merchantFeedXml({
      locale,
      baseUrl: siteUrl(),
      collectibles,
      catalog: settings.catalog,
      checkoutEnabled: settings.checkoutEnabled,
    });
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    // An empty feed would take every product offline in Merchant Center; a failed fetch keeps the last one.
    console.error("[merchant-feed] could not be built:", error instanceof Error ? error.message : error);
    return new Response("Feed temporarily unavailable", { status: 503, headers: { "Retry-After": "3600" } });
  }
}
