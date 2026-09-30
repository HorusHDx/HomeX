import type { MetadataRoute } from "next";

const BASE = "https://home-x-jet.vercel.app";

const STATIC_ROUTES = [
  "",
  "/search",
  "/anime",
  "/anime2",
  "/historial",
  "/genre/movie",
  "/genre/tv",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_ROUTES.map((route) => ({
    url: `${BASE}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1 : 0.7,
  }));
}
