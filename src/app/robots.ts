import type { MetadataRoute } from "next";

const siteUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
