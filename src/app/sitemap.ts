import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://agentopia.online";

  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/auth/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/auth/signup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/leaderboard`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 },
  ];
}
