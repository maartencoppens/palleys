import type { MetadataRoute } from "next";
import { siteUrl } from "@/core/seo/metadata";

// Everything a visitor can see may be indexed; the backoffice and the API not. Pages that are personal (cart, checkout,
// order status) say noindex themselves, so crawlers have to be allowed to read them. The product photos are served under
// /api, so that one path is allowed: search engines need them for image results and product listings.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/api/collectibles/images/"], disallow: ["/admin/", "/api/", "/dev/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
