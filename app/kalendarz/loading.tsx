export default function CalendarLoading() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto animate-pulse" aria-label="Ładowanie kalendarza">
      <div className="flex items-center justify-between mb-5">
        <div className="h-8 w-48 rounded bg-zinc-200" />
        <div className="h-9 w-24 rounded-lg bg-zinc-100" />
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200">
        {Array.from({ length: 42 }, (_, index) => (
          <div key={index} className="min-h-[72px] bg-white p-2">
            <div className="h-3 w-5 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
