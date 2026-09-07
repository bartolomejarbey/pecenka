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
  /*
   * Adresy, na které lidé sáhnou sami.
   *
   * Portál hosta bydlí na `/pobyt` — tak se jmenuje i v e-mailu a tak mu
   * říkáme v textech („Váš pobyt"). Jenže první, co člověk zkusí, když si
   * odkaz nepamatuje, je `/host`. Nechat ho spadnout na 404 je zbytečná
   * hloupost: adres je pár a přesměrování nic nestojí.
   *
   * Dočasné (307), ne trvalé — kanonickou adresou zůstává `/pobyt` a trvalé
   * přesměrování si prohlížeče zapamatují napořád, takže by se to špatně
   * měnilo.
   */
  async redirects() {
    const naPortal = ["/host", "/hoste", "/klient", "/muj-pobyt", "/moje-rezervace"];
    return [
      ...naPortal.map((source) => ({ source, destination: "/pobyt", permanent: false })),
      // I podstránky: kdo si uloží /host/protokol, ať se dostane, kam chtěl.
      { source: "/host/:cesta*", destination: "/pobyt/:cesta*", permanent: false },
      // Administrace má vlastní zvyk — „přihlásit se do systému".
      { source: "/prihlaseni", destination: "/admin/prihlaseni", permanent: false },
    ];
  },

  /*
   * Bezpečnostní hlavičky.
   *
   * Dřív je nasazovala proxy, což znamenalo invokaci Node před každou
   * odpovědí. Tady je nasazuje statická konfigurace a platí i pro soubory
   * z CDN.
   *
   * CSP chyběla úplně. Bez ní by jakékoli XSS v administraci — přes jméno
   * hosta, interní poznámku nebo odůvodnění škody — mohlo vynést podepsané
   * odkazy na fotky interiéru. `unsafe-inline` u stylů zůstat musí (Next
   * vkládá kritické CSS inline), u skriptů ne.
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");

    return [
      {
        source: "/:cesta*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Web se nikam nevkládá do rámu — obrana proti clickjackingu.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Na cizí weby posíláme jen doménu, ne celou adresu (kódy rezervací!).
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            // Fotoaparát potřebuje portál hosta — `capture` na vstupu souboru
            // ho v některých prohlížečích otevírá jako zařízení.
            value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
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
