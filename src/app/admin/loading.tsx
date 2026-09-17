import { CardsSkeleton, TableSkeleton } from "@/components/shared";

export default function Loading() {
  return (
    <div>
      <div className="mb-5">
        <div className="h-5 w-40 rounded bg-muted" />
        <div className="mt-2 h-3.5 w-64 rounded bg-muted" />
      </div>
      <CardsSkeleton />
      <div className="mt-4 rounded-xl border border-border bg-surface">
        <TableSkeleton rows={7} />
      </div>
    </div>
  );
}
