import LeafletMapa from "@/components/okoli/LeafletMapa";
import { LOCATION } from "@/lib/content";

/** Mapa s jedinou značkou — lomem. Bublina je otevřená hned. */
export default function MapaLomu() {
  return (
    <LeafletMapa
      body={[
        {
          id: "lom",
          nazev: LOCATION.name,
          lat: LOCATION.lat,
          lng: LOCATION.lng,
          ton: "doma",
          podtitul: `${LOCATION.nickname} · GPS ${LOCATION.gpsDecimal}`,
        },
      ]}
      stred={{ lat: LOCATION.lat, lng: LOCATION.lng }}
      zoom={14}
      vybrany="lom"
      className="h-[380px] md:h-[480px]"
      popisek="Mapa s polohou lomu Jílové u Držkova"
    />
  );
}
