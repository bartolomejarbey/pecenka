import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // PGlite si veze Postgres jako WASM a rozšíření jako .tar.gz. Bundler z nich
  // udělá statická aktiva pod /_next/static/media, která pak serverový proces
  // neumí načíst — proto ho necháváme mimo bundle a načítá se přes require.
  // PGlite mimo bundle (viz výš). Sharp taky, ale z jiného důvodu: je to
  // nativní modul a jeho .so knihovny bundler nepobere. Bez toho se
  // v nasazení nenačte a spadne všechno, co sahá na fotky.
  serverExternalPackages: ["@electric-sql/pglite", "sharp"],
  // Trasování souborů nativní knihovny samo nenajde — do balíčku funkce se
  // musí přibalit ručně, jinak `require` narazí na chybějící libvips.
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/@img/**"],
  },
  images: {
    // AVIF u fotek lesa a lomu ušetří ~30 % oproti WebP; WebP zůstává jako záloha.
    formats: ["image/avif", "image/webp"],
    // Skutečné body zlomu webu — bez toho Next generuje i velikosti, které nikdy nepoužijeme.
    deviceSizes: [390, 640, 828, 1080, 1280, 1620, 1920, 2560],
    imageSizes: [64, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
};

export default nextConfig;
