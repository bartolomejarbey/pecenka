import type { MetadataRoute } from "next";
import { SITE } from "@/lib/content";

const LEGAL = new Set([
  "/obchodni-podminky",
  "/ochrana-osobnich-udaju",
  "/cookies",
]);

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    "",
    "/domky",
    "/domky/achat",
    "/domky/mech",
    "/rezervace",
    "/lokalita",
    "/galerie",
    "/cenik",
    "/o-nas",
    "/faq",
    "/kontakt",
    "/darkovy-poukaz",
    "/obchodni-podminky",
    "/ochrana-osobnich-udaju",
    "/cookies",
  ];
  return routes.map((r) => ({
    url: `${SITE.url}${r}`,
    lastModified: now,
    changeFrequency: LEGAL.has(r) ? "yearly" : r === "" ? "weekly" : "monthly",
    priority: LEGAL.has(r)
      ? 0.3
      : r === ""
        ? 1
        : r.startsWith("/domky") || r === "/rezervace"
          ? 0.9
          : 0.6,
  }));
}
