import type { MetadataRoute } from "next";
import { SITE } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/domky",
    "/domky/zula",
    "/domky/mech",
    "/rezervace",
    "/lokalita",
    "/galerie",
    "/cenik",
    "/faq",
    "/kontakt",
    "/darkovy-poukaz",
    "/obchodni-podminky",
    "/ochrana-osobnich-udaju",
    "/cookies",
  ];
  return routes.map((r) => ({
    url: `${SITE.url}${r}`,
    changeFrequency: r === "" ? "weekly" : "monthly",
    priority: r === "" ? 1 : r.startsWith("/domky") || r === "/rezervace" ? 0.9 : 0.6,
  }));
}
