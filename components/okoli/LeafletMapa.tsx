"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Mapa na Leafletu s dlaždicemi OpenStreetMap.
 *
 * Leaflet sahá na `window`, proto se načítá dynamicky až v prohlížeči a až po
 * prvním vykreslení; stránka se vykreslí i bez něj (seznam míst je vedle mapy
 * obyčejné HTML). Značky jsou `divIcon` s vlastním CSS — žádné obrázky
 * z balíčku, žádná cesta k ikonám, kterou by bundler rozbil.
 *
 * Kolečko myši zoomuje až po klepnutí do mapy. Jinak mapa uprostřed stránky
 * ukradne rolování a člověk se z ní nedostane.
 */

export type TonZnacky = "leto" | "zima" | "celorocne" | "doma";

export type BodMapy = {
  id: string;
  nazev: string;
  lat: number;
  lng: number;
  ton: TonZnacky;
  /** Druhý řádek v bublině. */
  podtitul?: string;
};

type Props = {
  body: BodMapy[];
  stred: { lat: number; lng: number };
  zoom: number;
  /** Id zvýrazněného bodu — mapa na něj přejede a otevře bublinu. */
  vybrany?: string | null;
  /** Klepnutí na značku. */
  onVyber?: (id: string) => void;
  /** Po změně sady bodů přizpůsobit výřez, aby byly všechny vidět. */
  prizpusobit?: boolean;
  className?: string;
  /** Popis pro čtečky. */
  popisek: string;
};

const DLAZDICE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const AUTOR =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';

function uniknout(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

export default function LeafletMapa({
  body,
  stred,
  zoom,
  vybrany = null,
  onVyber,
  prizpusobit = false,
  className = "",
  popisek,
}: Props) {
  const el = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const mapa = useRef<Leaflet.Map | null>(null);
  const vrstva = useRef<Leaflet.LayerGroup | null>(null);
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
      Lf.tileLayer(DLAZDICE, { maxZoom: 18, attribution: AUTOR }).addTo(m);
      m.on("click", () => m.scrollWheelZoom.enable());
      m.on("mouseout", () => m.scrollWheelZoom.disable());
      vrstva.current = Lf.layerGroup().addTo(m);
      mapa.current = m;
      setPripraveno(true);
    });
    return () => {
      zruseno = true;
      mapa.current?.remove();
      mapa.current = null;
      vrstva.current = null;
      znacky.current.clear();
    };
    // Střed a zoom jsou jen výchozí pohled; po načtení se mapa řídí body a výběrem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Značky — překreslit, když se změní sada bodů.
  useEffect(() => {
    const Lf = L.current;
    const m = mapa.current;
    const v = vrstva.current;
    if (!pripraveno || !Lf || !m || !v) return;
    v.clearLayers();
    znacky.current.clear();
    for (const b of body) {
      const velikost = b.ton === "doma" ? 26 : 22;
      const znacka = Lf.marker([b.lat, b.lng], {
        icon: Lf.divIcon({
          className: `znacka znacka-${b.ton}`,
          html: "<span></span>",
          iconSize: [velikost, velikost],
          iconAnchor: [velikost / 2, velikost / 2],
          popupAnchor: [0, -velikost / 2 - 2],
        }),
        title: b.nazev,
        alt: b.nazev,
        keyboard: true,
      });
      znacka.bindPopup(
        `<strong class="bublina-nazev">${uniknout(b.nazev)}</strong>${
          b.podtitul ? `<span class="bublina-pod">${uniknout(b.podtitul)}</span>` : ""
        }`,
        { closeButton: false },
      );
      znacka.on("click", () => onVyberRef.current?.(b.id));
      znacka.addTo(v);
      znacky.current.set(b.id, znacka);
    }
    if (prizpusobit && body.length > 1) {
      m.fitBounds(
        Lf.latLngBounds(body.map((b) => [b.lat, b.lng] as [number, number])),
        { padding: [36, 36], maxZoom: 12 },
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
    if (!vybrany) return;
    const z = znacky.current.get(vybrany);
    if (!z) return;
    const kde = z.getLatLng();
    if (!m.getBounds().pad(-0.15).contains(kde)) m.panTo(kde, { animate: true });
    z.openPopup();
  }, [vybrany, pripraveno, body]);

  return (
    <div
      className={`mapa-lom relative overflow-hidden rounded-[28px] border border-night/10 bg-mist-dim ${className}`}
    >
      <div ref={el} role="region" aria-label={popisek} className="absolute inset-0" />
      {!pripraveno && (
        <p
          className="absolute inset-0 flex items-center justify-center text-sm text-shale-deep"
          aria-hidden="true"
        >
          Mapa se načítá…
        </p>
      )}
    </div>
  );
}
