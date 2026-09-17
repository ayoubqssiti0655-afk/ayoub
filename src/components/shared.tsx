"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

const ICON_REGISTRY: Record<string, React.ElementType> = {
  ClipboardList: Icons.ClipboardList, PackageCheck: Icons.PackageCheck, Truck: Icons.Truck, TrendingUp: Icons.TrendingUp,
  Banknote: Icons.Banknote, Wallet: Icons.Wallet, AlertTriangle: Icons.AlertTriangle, Timer: Icons.Timer,
  ShoppingCart: Icons.ShoppingCart, Package: Icons.Package, Users: Icons.Users, RotateCcw: Icons.RotateCcw,
  Percent: Icons.Percent, ScrollText: Icons.ScrollText, CheckCircle2: Icons.CheckCircle2, Bike: Icons.Bike,
  Building2: Icons.Building2, MapPinned: Icons.MapPinned, ChartLine: Icons.ChartLine, Tag: Icons.Tag,
  Bell: Icons.Bell, PhoneCall: Icons.PhoneCall, ShieldAlert: Icons.ShieldAlert,
};
function resolveIcon(icon?: string | React.ElementType): React.ElementType | undefined {
  if (!icon) return undefined;
  if (typeof icon === "string") return ICON_REGISTRY[icon] ?? Icons.Circle;
  if (typeof icon === "function" || (typeof icon === "object" && icon !== null)) return icon;
  return Icons.Circle;
}
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ── Empty state ───────────────────────────────────────────────────
export function EmptyState({
  icon: iconInput,
  title,
  description,
  action,
  className,
}: {
  icon?: string | React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const Icon = resolveIcon(iconInput);
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {Icon && (
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-border bg-surface-2">
          <Icon className="size-5 text-muted-foreground" strokeWidth={1.8} />
        </div>
      )}
      <p className="text-[14px] font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-5 text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── KPI stat card ─────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  delta,
  deltaGood,
  hint,
  icon,
  accent,
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: string;
  deltaGood?: boolean;
  hint?: string;
  icon?: string | React.ElementType;
  accent?: string;
  className?: string;
}) {
  const Icon = resolveIcon(icon);
  return (
    <div className={cn("group relative rounded-xl border border-border bg-surface p-4 shadow-xs transition-shadow hover:shadow-sm", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <div className="flex size-7 items-center justify-center rounded-lg" style={{ background: accent ? `${accent}14` : "var(--primary-soft)" }}>
            <Icon className="size-3.5" strokeWidth={2} style={{ color: accent ?? "var(--primary)" }} />
          </div>
        )}
      </div>
      <p className="mt-2 text-[22px] font-semibold tracking-[-0.02em] tnum">{value}</p>
      <div className="mt-1 flex items-center gap-1.5 text-[11.5px]">
        {delta && (
          <span className={cn("font-medium tnum", deltaGood === undefined ? "text-muted-foreground" : deltaGood ? "text-success" : "text-error")}>
            {delta}
          </span>
        )}
        {hint && <span className="text-faint">{hint}</span>}
      </div>
    </div>
  );
}

// ── Skeleton page scaffold ────────────────────────────────────────
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-10 items-center gap-4">
          <div className="h-3.5 w-24 rounded bg-muted" />
          <div className="h-3.5 flex-1 rounded bg-muted" />
          <div className="h-3.5 w-16 rounded bg-muted" />
          <div className="h-3.5 w-20 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-[104px] rounded-xl border border-border bg-surface p-4">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="mt-3 h-6 w-24 rounded bg-muted" />
          <div className="mt-3 h-3 w-14 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────
export function Pagination({ page, totalPages, total, per, basePath, params }: {
  page: number; totalPages: number; total: number; per: number;
  basePath: string; params: Record<string, string | undefined>;
}) {
  const { t } = useI18n();
  const go = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set("page", String(p));
    window.location.href = `${basePath}?${sp.toString()}`;
  };
  const from = (page - 1) * per + 1;
  const to = Math.min(total, page * per);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <p className="text-[12.5px] text-muted-foreground tnum">
        {t("common.showing", { from, to, total })}
      </p>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="iconSm" disabled={page <= 1} onClick={() => go(page - 1)} aria-label={t("common.prev")}>
          <ChevronLeft className="size-4 rtl:rotate-180" />
        </Button>
        <span className="min-w-14 text-center text-[12.5px] font-medium tnum">
          {page} / {Math.max(1, totalPages)}
        </span>
        <Button variant="outline" size="iconSm" disabled={page >= totalPages} onClick={() => go(page + 1)} aria-label={t("common.next")}>
          <ChevronRight className="size-4 rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
}

// ── Page header ───────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.02em]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
