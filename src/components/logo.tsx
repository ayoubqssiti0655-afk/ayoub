import { cn } from "@/lib/utils";

/** Masar brand mark — a route waypoint glyph in the brand cobalt. */
export function Logo({ className, mark = false }: { className?: string; mark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden className="shrink-0">
        <rect width="26" height="26" rx="7" fill="var(--primary)" />
        <path
          d="M7 17.5c0-4 3-5.5 6-6.5 2.5-.83 4-1.8 4-4M7 17.5c0 1.5 1 2.5 2.5 2.5h7"
          stroke="white" strokeWidth="2.1" strokeLinecap="round" opacity="0.95"
        />
        <circle cx="7" cy="17.5" r="2.2" fill="white" />
        <circle cx="19" cy="6.5" r="2.2" fill="white" />
      </svg>
      {!mark && <span className="text-[17px] font-semibold tracking-[-0.02em] text-foreground">Masar</span>}
    </span>
  );
}
