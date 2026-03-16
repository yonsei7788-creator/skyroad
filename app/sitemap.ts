import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-03-16");

  return [
    {
      url: "https://skyroad.co.kr",
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: "https://skyroad.co.kr/pricing",
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://skyroad.co.kr/about",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://skyroad.co.kr/legal/terms",
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://skyroad.co.kr/legal/privacy",
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
