import { NextResponse } from "next/server";

/**
 * Manifest aplikace hosta.
 *
 * Web má vlastní manifest se `start_url: "/"`. Kdyby si host přidal pobyt na
 * plochu s ním, ikona by otevírala úvodní stránku webu s rezervačním
 * formulářem — ne jeho pobyt. Tenhle startuje na `/pobyt` a jmenuje se
 * podle toho, co host na ploše hledá.
 */
export function GET() {
  return NextResponse.json(
    {
      name: "Sedmý les — váš pobyt",
      short_name: "Sedmý les",
      description: "Cesta, kód od schránky, wifi a odjezd z vašeho domku.",
      start_url: "/pobyt",
      scope: "/pobyt",
      display: "standalone",
      background_color: "#0c110f",
      theme_color: "#0c110f",
      lang: "cs",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } },
  );
}
