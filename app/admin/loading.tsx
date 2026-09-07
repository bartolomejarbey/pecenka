/**
 * Kostra administrace.
 *
 * Všechny stránky administrace jsou dynamické a čtou z databáze. Bez tohohle
 * souboru nedal klik ve spodní liště na mobilních datech žádnou odezvu, dokud
 * dotazy nedoběhly — a majitel mačkal znovu.
 */
export default function NacitaSe() {
  return (
    <div className="min-h-svh bg-night px-5 py-6 md:px-8" aria-busy="true">
      <div className="mx-auto max-w-5xl">
        <div className="h-7 w-40 animate-pulse rounded-lg bg-linen/10" />
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-linen/10 bg-bark p-5">
              <div className="h-4 w-28 animate-pulse rounded bg-linen/10" />
              <div className="mt-5 h-4 w-3/4 animate-pulse rounded bg-linen/[0.07]" />
              <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-linen/[0.07]" />
            </div>
          ))}
        </div>
        <p className="sr-only">Načítám…</p>
      </div>
    </div>
  );
}
