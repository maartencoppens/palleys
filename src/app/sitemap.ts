import type { MetadataRoute } from "next";

const siteUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/about`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/create`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
