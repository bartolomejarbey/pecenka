/** Kostra aplikace hosta. Host je na mobilních datech v lese — prázdno je horší než kostra. */
export default function NacitaSe() {
  return (
    <main className="mx-auto max-w-lg" aria-busy="true">
      <div className="h-[46svh] min-h-[300px] max-h-[440px] animate-pulse bg-linen/[0.06]" />
      <div className="space-y-4 px-5 pt-5">
        <div className="h-28 animate-pulse rounded-2xl bg-linen/[0.05]" />
        <div className="h-20 animate-pulse rounded-2xl bg-linen/[0.05]" />
        <div className="h-[52px] animate-pulse rounded-full bg-linen/[0.05]" />
      </div>
      <p className="sr-only">Načítám…</p>
    </main>
  );
}
