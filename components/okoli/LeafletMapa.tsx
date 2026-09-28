"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Mapa na Leafletu se dvěma podklady.
 *
 * Satelit (Esri World Imagery + vrstva s názvy míst) je výchozí: lom je na
 * něm vidět jako tmavá kapka mezi stromy a hory kolem jsou hory, ne béžová
 * plocha s čarami. Turistická mapa je OpenTopoMap (vrstevnice, značené cesty);
 * s klíčem `NEXT_PUBLIC_MAPY_API_KEY` ji nahradí outdoor mapa Mapy.com, která
 * je pro Česko nejlepší.
 *
 * Leaflet sahá na `window`, proto se načítá dynamicky až v prohlížeči. Značky
 * jsou `divIcon` s vlastním CSS — žádné obrázky z balíčku. Kolečko myši
 * zoomuje až po klepnutí do mapy, jinak mapa uprostřed stránky ukradne
 * rolování.
 */

export type TonZnacky = "leto" | "zima" | "celorocne" | "doma";
export type Vrstva = "satelit" | "turisticka";

export type BodMapy = {
  id: string;
  nazev: string;
  lat: number;
  lng: number;
  ton: TonZnacky;
  /** Druhý řádek v bublině. */
  podtitul?: string;
  /** Náhled do bubliny. */
  foto?: string;
};

type Props = {
  body: BodMapy[];
  stred: { lat: number; lng: number };
  zoom: number;
  vrstva?: Vrstva;
  /** Id zvýrazněného bodu — mapa na něj přejede a otevře bublinu. */
  vybrany?: string | null;
  onVyber?: (id: string) => void;
  /** Po změně sady bodů přizpůsobit výřez, aby byly všechny vidět. */
  prizpusobit?: boolean;
  className?: string;
  popisek: string;
};

type Podklad = {
  url: string;
  attribution: string;
  maxZoom: number;
  className: string;
  subdomains?: string;
  /** Průhledná vrstva s popisky nad satelitem. */
  popisky?: string;
};

const MAPY_KLIC = process.env.NEXT_PUBLIC_MAPY_API_KEY;

const PODKLADY: Record<Vrstva, Podklad> = {
  satelit: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Snímky &copy; Esri, Maxar, Earthstar Geographics, GIS User Community",
    maxZoom: 18,
    className: "dlazdice-satelit",
    popisky:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  },
  turisticka: MAPY_KLIC
    ? {
        url: `https://api.mapy.com/v1/maptiles/outdoor/256/{z}/{x}/{y}?apikey=${MAPY_KLIC}`,
        attribution:
          '&copy; <a href="https://mapy.com" target="_blank" rel="noopener noreferrer">Seznam.cz, a.s.</a>, &copy; OpenStreetMap',
        maxZoom: 18,
        className: "dlazdice-topo",
      }
    : {
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>, SRTM · <a href="https://opentopomap.org" target="_blank" rel="noopener noreferrer">OpenTopoMap</a> (CC-BY-SA)',
        maxZoom: 17,
        className: "dlazdice-topo",
        subdomains: "abc",
      },
};

function uniknout(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

export default function LeafletMapa({
  body,
  stred,
  zoom,
  vrstva = "satelit",
  vybrany = null,
  onVyber,
  prizpusobit = false,
  className = "",
  popisek,
}: Props) {
  const el = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const mapa = useRef<Leaflet.Map | null>(null);
  const podklad = useRef<Leaflet.TileLayer[]>([]);
  const vrstvaZnacek = useRef<Leaflet.LayerGroup | null>(null);
  const znacky = useRef<Map<string, Leaflet.Marker>>(new Map());
  const onVyberRef = useRef(onVyber);
  onVyberRef.current = onVyber;
  const [pripraveno, setPripraveno] = useState(false);

  useEffect(() => {
    let zruseno = false;
    import("leaflet").then((mod) => {
      if (zruseno || !el.current || mapa.current) return;
      // Balíček je CommonJS — dynamický import ho vrátí pod `default`.
      const Lf = ((mod as unknown as { default?: typeof Leaflet }).default ?? mod) as typeof Leaflet;
      L.current = Lf;
      const m = Lf.map(el.current, {
        scrollWheelZoom: false,
        attributionControl: true,
        zoomControl: true,
      }).setView([stred.lat, stred.lng], zoom);
      m.attributionControl.setPrefix(false);
      m.on("click", () => m.scrollWheelZoom.enable());
      m.on("mouseout", () => m.scrollWheelZoom.disable());
      vrstvaZnacek.current = Lf.layerGroup().addTo(m);
      mapa.current = m;
      setPripraveno(true);
    });
    return () => {
      zruseno = true;
      mapa.current?.remove();
      mapa.current = null;
      vrstvaZnacek.current = null;
      podklad.current = [];
      znacky.current.clear();
    };
    // Střed a zoom jsou jen výchozí pohled; po načtení se mapa řídí body a výběrem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Podklad — vyměnit při přepnutí satelit / turistická.
  useEffect(() => {
    const Lf = L.current;
    const m = mapa.current;
    if (!pripraveno || !Lf || !m) return;
    for (const v of podklad.current) v.remove();
    const cfg = PODKLADY[vrstva];
    const nove = [
      Lf.tileLayer(cfg.url, {
        maxZoom: cfg.maxZoom,
        attribution: cfg.attribution,
        className: cfg.className,
        subdomains: cfg.subdomains ?? "abc",
        crossOrigin: false,
      }),
    ];
    if (cfg.popisky) {
      nove.push(Lf.tileLayer(cfg.popisky, { maxZoom: cfg.maxZoom, className: "dlazdice-popisky", pane: "overlayPane" }));
    }
    for (const v of nove) v.addTo(m);
    podklad.current = nove;
    m.setMaxZoom(cfg.maxZoom);
    if (m.getZoom() > cfg.maxZoom) m.setZoom(cfg.maxZoom);
    el.current?.classList.toggle("mapa-satelit", vrstva === "satelit");
  }, [vrstva, pripraveno]);

  // Značky — překreslit, když se změní sada bodů.
  useEffect(() => {
    const Lf = L.current;
    const m = mapa.current;
    const v = vrstvaZnacek.current;
    if (!pripraveno || !Lf || !m || !v) return;
    v.clearLayers();
    znacky.current.clear();
    for (const b of body) {
      const velikost = b.ton === "doma" ? 30 : 24;
      const znacka = Lf.marker([b.lat, b.lng], {
        icon: Lf.divIcon({
          className: `znacka znacka-${b.ton}`,
          html: "<span></span>",
          iconSize: [velikost, velikost],
          iconAnchor: [velikost / 2, velikost / 2],
          popupAnchor: [0, -velikost / 2 - 4],
        }),
        title: b.nazev,
        alt: b.nazev,
        keyboard: true,
      });
      znacka.bindPopup(
        `<div class="bublina">${b.foto ? `<img src="${uniknout(b.foto)}" alt="" class="bublina-foto" loading="lazy">` : ""}<strong class="bublina-nazev">${uniknout(b.nazev)}</strong>${
          b.podtitul ? `<span class="bublina-pod">${uniknout(b.podtitul)}</span>` : ""
        }</div>`,
        { closeButton: false, minWidth: b.foto ? 220 : 160, maxWidth: 260 },
      );
      znacka.on("click", () => onVyberRef.current?.(b.id));
      znacka.addTo(v);
      znacky.current.set(b.id, znacka);
    }
    if (prizpusobit && body.length > 1) {
      m.fitBounds(
        Lf.latLngBounds(body.map((b) => [b.lat, b.lng] as [number, number])),
        { padding: [40, 40], maxZoom: 12 },
      );
    } else {
      m.setView([stred.lat, stred.lng], zoom);
    }
  }, [body, pripraveno, prizpusobit, stred.lat, stred.lng, zoom]);

  // Výběr — zvýraznit značku, přejet na ni a otevřít bublinu.
  useEffect(() => {
    const m = mapa.current;
    if (!pripraveno || !m) return;
    for (const [id, z] of znacky.current) {
      z.getElement()?.classList.toggle("znacka-aktivni", id === vybrany);
    }
    if (!vybrany) {
      m.closePopup();
      return;
    }
    const z = znacky.current.get(vybrany);
    if (!z) return;
    const kde = z.getLatLng();
    if (!m.getBounds().pad(-0.15).contains(kde)) m.panTo(kde, { animate: true });
    z.openPopup();
  }, [vybrany, pripraveno, body]);

  return (
    <div className={`mapa-lom relative overflow-hidden bg-night ${className}`}>
      <div ref={el} role="region" aria-label={popisek} className="absolute inset-0" />
      {!pripraveno && (
        <p
          className="absolute inset-0 flex items-center justify-center text-sm text-sage"
          aria-hidden="true"
        >
          Mapa se načítá…
        </p>
      )}
    </div>
  );
}
