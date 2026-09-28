import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sedmý les — tiny housy u lomu Jílové u Držkova",
    short_name: "Sedmý les",
    description:
      "Dva černé tiny housy u zatopeného lomu Jílové u Držkova v Libereckém kraji, na pomezí Českého ráje a Jizerských hor.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a1416",
    theme_color: "#0a1416",
    lang: "cs",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
