/**
 * Kostra rezervačního průvodce — Suspense fallback pro celý průvodce.
 */
export default function WizardSkeleton() {
  return (
    <div
      className="animate-pulse rounded-[34px] border border-linen/8 bg-bark p-6 md:p-10"
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


/**
 * Kostra kalendáře. Drží přesně tu výšku, kterou pak zabere skutečný
 * kalendář, aby se při hydrataci nehnul zbytek stránky. Dva měsíce vedle
 * sebe na desktopu, jeden na mobilu — stejně jako `Calendar`.
 */
export function CalendarSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="mb-5 flex items-center justify-between">
        <div className="h-10 w-10 rounded-full bg-pine" />
        <div className="h-4 w-40 rounded-full bg-pine" />
        <div className="h-10 w-10 rounded-full bg-pine" />
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        {[0, 1].map((m) => (
          <div key={m} className={m === 1 ? "hidden md:block" : undefined}>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 42 }, (_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-pine/60" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
