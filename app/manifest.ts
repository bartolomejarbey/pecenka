import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sedmý les — tiny housy u zatopeného lomu",
    short_name: "Sedmý les",
    description:
      "Dva černé tiny housy na samotě u zatopeného lomu na okraji Českého ráje.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c110f",
    theme_color: "#0c110f",
    lang: "cs",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
