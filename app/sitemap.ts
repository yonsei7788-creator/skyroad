import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-03-16");

  return [
    {
      url: "https://skyroadedu.net",
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: "https://skyroadedu.net/pricing",
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://skyroadedu.net/about",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://skyroadedu.net/legal/terms",
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://skyroadedu.net/legal/privacy",
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
