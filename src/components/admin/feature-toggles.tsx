"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle, ShieldCheck, Wand2, Wallet, RadioTower, ScanLine, BellRing,
  CreditCard, RefreshCcw, Sparkles, CalendarClock, PackageOpen, Zap, Boxes,
  Star, MapPinned, Brain, Newspaper, ChartLine, Scale, Store, PhoneCall,
  LifeBuoy, UserCog, FileText, Siren, Weight, TicketPercent, Truck, Navigation,
  Receipt, CheckSquare, Bike, Landmark, FileSpreadsheet, ShieldAlert,
  Search, X, Check, SlidersHorizontal, CheckCircle2, XCircle, Power, Circle,
  FileCheck, RotateCcw, Printer, PackageCheck, Sheet, PhoneForwarded,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Switch } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { setFeatureAction, setFeaturesBatchAction } from "@/server/admin-actions";
import type { FeatureCategory } from "@/server/features";

const ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  MessageCircle, ShieldCheck, Wand2, Wallet, RadioTower, ScanLine, BellRing,
  CreditCard, RefreshCcw, Sparkles, CalendarClock, PackageOpen, Zap, Boxes,
  Star, MapPinned, Brain, Newspaper, ChartLine, Scale, Store, PhoneCall,
  LifeBuoy, UserCog, FileText, Siren, Weight, TicketPercent, Truck, Navigation,
  Receipt, CheckSquare, Bike, Landmark, FileSpreadsheet, ShieldAlert, Circle,
  FileCheck, RotateCcw, Printer, PackageCheck, Sheet, PhoneForwarded,
};

export type FeatureRow = {
  key: string;
  icon: string;
  category: FeatureCategory;
  enabled: boolean;
};

const CATEGORIES: {
  id: FeatureCategory;
  nameKey: string;
  descKey: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  accentBadge: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
}[] = [
  {
    id: "admin",
    nameKey: "features.cat.admin.name",
    descKey: "features.cat.admin.desc",
    icon: RadioTower,
    accentBadge: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40",
    accentBg: "bg-purple-500/10",
    accentText: "text-purple-600 dark:text-purple-400",
    accentBorder: "border-purple-500/30",
  },
  {
    id: "courier",
    nameKey: "features.cat.courier.name",
    descKey: "features.cat.courier.desc",
    icon: Bike,
    accentBadge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
    accentBg: "bg-emerald-500/10",
    accentText: "text-emerald-600 dark:text-emerald-400",
    accentBorder: "border-emerald-500/30",
  },
  {
    id: "merchant",
    nameKey: "features.cat.merchant.name",
    descKey: "features.cat.merchant.desc",
    icon: Store,
    accentBadge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40",
    accentBg: "bg-blue-500/10",
    accentText: "text-blue-600 dark:text-blue-400",
    accentBorder: "border-blue-500/30",
  },
  {
    id: "logistics_ai",
    nameKey: "features.cat.logistics_ai.name",
    descKey: "features.cat.logistics_ai.desc",
    icon: Sparkles,
    accentBadge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40",
    accentBg: "bg-amber-500/10",
    accentText: "text-amber-600 dark:text-amber-400",
    accentBorder: "border-amber-500/30",
  },
  {
    id: "finance",
    nameKey: "features.cat.finance.name",
    descKey: "features.cat.finance.desc",
    icon: Wallet,
    accentBadge: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/40",
    accentBg: "bg-teal-500/10",
    accentText: "text-teal-600 dark:text-teal-400",
    accentBorder: "border-teal-500/30",
  },
  {
    id: "communication",
    nameKey: "features.cat.communication.name",
    descKey: "features.cat.communication.desc",
    icon: MessageCircle,
    accentBadge: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/40",
    accentBg: "bg-sky-500/10",
    accentText: "text-sky-600 dark:text-sky-400",
    accentBorder: "border-sky-500/30",
  },
];

export function FeatureToggles({ features }: { features: FeatureRow[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [batchBusy, setBatchBusy] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<"all" | FeatureCategory>("all");
  const [state, setState] = React.useState(() =>
    Object.fromEntries(features.map((f) => [f.key, f.enabled]))
  );

  // Global counts
  const totalCount = features.length;
  const activeCount = Object.values(state).filter(Boolean).length;
  const inactiveCount = totalCount - activeCount;

  async function toggle(key: string, enabled: boolean) {
    setBusy(key);
    setState((s) => ({ ...s, [key]: enabled })); // optimistic
    const res = await setFeatureAction(key, enabled);
    setBusy(null);
    if (res.ok) {
      toast.push({ title: t("settings.saved"), variant: "success" });
      router.refresh();
    } else {
      setState((s) => ({ ...s, [key]: !enabled })); // revert
      toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
    }
  }

  async function toggleCategory(category: FeatureCategory, enable: boolean) {
    const catFeatures = features.filter((f) => f.category === category);
    const keysToChange = catFeatures.map((f) => f.key);
    setBatchBusy(category);

    const prev = { ...state };
    const next = { ...state };
    for (const k of keysToChange) next[k] = enable;
    setState(next);

    const res = await setFeaturesBatchAction(keysToChange, enable);
    setBatchBusy(null);

    if (res.ok) {
      toast.push({ title: t("settings.saved"), variant: "success" });
      router.refresh();
    } else {
      setState(prev);
      toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
    }
  }

  // Filter features based on search and selectedCategory
  const query = search.trim().toLowerCase();
  const filteredCategories = CATEGORIES.filter((cat) => {
    if (selectedCategory !== "all" && cat.id !== selectedCategory) return false;
    if (!query) return true;

    // Check if category name/desc matches
    const catName = t(cat.nameKey).toLowerCase();
    const catDesc = t(cat.descKey).toLowerCase();
    if (catName.includes(query) || catDesc.includes(query)) return true;

    // Or any child feature matches
    return features.some((f) => {
      if (f.category !== cat.id) return false;
      const fName = t(`features.f.${f.key}.name`).toLowerCase();
      const fDesc = t(`features.f.${f.key}.desc`).toLowerCase();
      return fName.includes(query) || fDesc.includes(query) || f.key.toLowerCase().includes(query);
    });
  });

  return (
    <div className="space-y-6">
      {/* Top Bar: Summary KPIs + Search + Quick Bulk */}
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* KPI Counters */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-1.5 border border-border">
              <SlidersHorizontal className="size-4 text-primary" />
              <span className="text-[12.5px] font-semibold text-muted-foreground">{t("features.stats.total")}:</span>
              <span className="text-[13px] font-bold text-foreground">{totalCount}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-1.5 border border-emerald-200 dark:border-emerald-800/30">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[12.5px] font-semibold text-emerald-700 dark:text-emerald-300">{t("features.stats.active")}:</span>
              <span className="text-[13px] font-bold text-emerald-700 dark:text-emerald-300">{activeCount}</span>
            </div>
            {inactiveCount > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-1.5 border border-amber-200 dark:border-amber-800/30">
                <XCircle className="size-4 text-amber-600 dark:text-amber-400" />
                <span className="text-[12.5px] font-semibold text-amber-700 dark:text-amber-300">{t("features.stats.inactive")}:</span>
                <span className="text-[13px] font-bold text-amber-700 dark:text-amber-300">{inactiveCount}</span>
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("features.search")}
              className="h-10 w-full rounded-xl border border-border bg-background ps-9 pe-9 text-[13px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs Filter */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar border-t border-border/70">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <span>{t("features.filter.all")}</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10.5px] font-bold ${selectedCategory === "all" ? "bg-white/20 text-white" : "bg-border text-foreground"}`}>
              {totalCount}
            </span>
          </button>

          {CATEGORIES.map((cat) => {
            const CatIcon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            const catFeatures = features.filter((f) => f.category === cat.id);
            const catActive = catFeatures.filter((f) => state[f.key]).length;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
                  isSelected
                    ? "bg-foreground text-background shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <CatIcon className="size-3.5" strokeWidth={2} />
                <span>{t(cat.nameKey)}</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10.5px] font-bold ${
                  isSelected ? "bg-background/20 text-background" : "bg-border text-foreground"
                }`}>
                  {catActive}/{catFeatures.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Feature Groups List */}
      {filteredCategories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <SlidersHorizontal className="mx-auto size-8 text-muted-foreground/40 mb-2" />
          <p className="text-[14px] font-medium text-muted-foreground">{t("features.emptySearch")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((cat) => {
            const CatIcon = cat.icon;
            const catFeatures = features.filter((f) => {
              if (f.category !== cat.id) return false;
              if (!query) return true;
              const fName = t(`features.f.${f.key}.name`).toLowerCase();
              const fDesc = t(`features.f.${f.key}.desc`).toLowerCase();
              return fName.includes(query) || fDesc.includes(query) || f.key.toLowerCase().includes(query);
            });

            if (catFeatures.length === 0) return null;

            const allCategoryFeatures = features.filter((f) => f.category === cat.id);
            const activeInCat = allCategoryFeatures.filter((f) => state[f.key]).length;
            const isAllEnabled = activeInCat === allCategoryFeatures.length;
            const isCatBusy = batchBusy === cat.id;

            return (
              <section
                key={cat.id}
                className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden transition-all"
              >
                {/* Section Header */}
                <div className="flex flex-col gap-3 border-b border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${cat.accentBadge}`}>
                      <CatIcon className={`size-5 ${cat.accentText}`} strokeWidth={2} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-[15px] font-bold text-foreground">{t(cat.nameKey)}</h2>
                        <span className="rounded-full bg-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {activeInCat} / {allCategoryFeatures.length} {t("features.on")}
                        </span>
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-0.5 leading-4">
                        {t(cat.descKey)}
                      </p>
                    </div>
                  </div>

                  {/* Batch Toggle for Category */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      disabled={isCatBusy}
                      onClick={() => toggleCategory(cat.id, !isAllEnabled)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11.5px] font-semibold transition-colors disabled:opacity-50 ${
                        isAllEnabled
                          ? "border-amber-200 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:border-amber-800/40 dark:text-amber-300"
                          : "border-primary/20 bg-primary-soft text-primary hover:bg-primary/20"
                      }`}
                    >
                      <Power className="size-3.5" />
                      <span>{isAllEnabled ? t("features.bulk.disableAll") : t("features.bulk.enableAll")}</span>
                    </button>
                  </div>
                </div>

                {/* Features Grid inside Category */}
                <ul className="grid gap-3 p-4 sm:grid-cols-2">
                  {catFeatures.map((f) => {
                    const Icon = ICONS[f.icon] ?? Circle;
                    const enabled = state[f.key] ?? true;
                    const isFeatureBusy = busy === f.key;

                    return (
                      <li
                        key={f.key}
                        className={`group relative flex items-start gap-3 rounded-xl border p-4 transition-all ${
                          enabled
                            ? "border-border bg-surface hover:border-primary/40 hover:shadow-xs"
                            : "border-dashed border-border/80 bg-muted/15 opacity-70 hover:opacity-100"
                        }`}
                      >
                        {/* Feature Icon */}
                        <span
                          className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                            enabled
                              ? `${cat.accentBg} ${cat.accentText}`
                              : "bg-muted text-faint"
                          }`}
                        >
                          <Icon className="size-5" strokeWidth={2} />
                        </span>

                        {/* Title & Description */}
                        <div className="min-w-0 flex-1 pe-2">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[13.5px] font-bold text-foreground">
                              {t(`features.f.${f.key}.name`)}
                            </p>
                          </div>
                          <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                            {t(`features.f.${f.key}.desc`)}
                          </p>
                        </div>

                        {/* Switch & Badge */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                          <Switch
                            checked={enabled}
                            disabled={isFeatureBusy || isCatBusy}
                            onCheckedChange={(v) => toggle(f.key, v)}
                            aria-label={t(`features.f.${f.key}.name`)}
                          />
                          <span
                            className={`text-[10.5px] font-bold uppercase tracking-wider ${
                              enabled ? "text-success" : "text-faint"
                            }`}
                          >
                            {enabled ? t("features.on") : t("features.off")}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
