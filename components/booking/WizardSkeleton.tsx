/**
 * Kostra rezervačního průvodce — zobrazuje se jako Suspense fallback
 * a do doby, než se na klientu připojí logika s daty (hydratační bezpečnost).
 */
export default function WizardSkeleton() {
  return (
    <div
      className="animate-pulse rounded-[34px] border border-linen/8 bg-bark/60 p-6 backdrop-blur md:p-10"
      aria-hidden="true"
    >
      <div className="hidden items-center gap-4 md:flex">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`flex items-center gap-4 ${i < 3 ? "flex-1" : ""}`}>
            <div className="h-9 w-9 shrink-0 rounded-full bg-pine" />
            <div className="h-3 w-16 rounded-full bg-pine" />
            {i < 3 && <div className="h-px flex-1 bg-pine" />}
          </div>
        ))}
      </div>
      <div className="h-4 w-40 rounded-full bg-pine md:hidden" />
      <div className="mt-10 h-7 w-3/5 rounded-full bg-pine md:w-2/5" />
      <div className="mt-3 h-4 w-2/5 rounded-full bg-pine/70" />
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <div className="aspect-[4/3] rounded-[28px] bg-pine" />
        <div className="hidden aspect-[4/3] rounded-[28px] bg-pine md:block" />
      </div>
      <div className="mt-10 flex justify-end">
        <div className="h-12 w-44 rounded-full bg-pine" />
      </div>
    </div>
  );
}
