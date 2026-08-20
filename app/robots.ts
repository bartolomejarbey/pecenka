import type { MetadataRoute } from "next";
import { SITE } from "@/lib/content";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Administrace, platební stránky a API do vyhledávače nepatří.
      // (Chráněné jsou i tak — tohle je jen slušnost vůči robotům.)
      disallow: ["/admin", "/admin/", "/api/", "/rezervace/*/platba"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
