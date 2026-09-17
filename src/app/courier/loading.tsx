export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-40 rounded bg-muted" />
      <div className="grid grid-cols-2 gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[84px] animate-pulse rounded-xl border border-border bg-surface" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-surface" />
      ))}
    </div>
  );
}
