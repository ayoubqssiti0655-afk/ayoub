"use client";

import * as React from "react";
import { Sparkles, TrendingUp, PhoneMissed, MapPin, Banknote, ClipboardList, Bike, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import Link from "next/link";

export type InsightView = { tone: "good" | "warn" | "bad" | "info"; icon: string; title: string; body: string; href?: string };

const ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  TrendingUp, PhoneMissed, MapPin, Banknote, ClipboardList, Bike, CheckCircle2, Sparkles,
};

const TONES = {
  good: { border: "border-success/30", bg: "bg-success-soft", color: "text-success" },
  warn: { border: "border-warning/30", bg: "bg-warning-soft", color: "text-warning" },
  bad: { border: "border-error/30", bg: "bg-error-soft", color: "text-error" },
  info: { border: "border-info/30", bg: "bg-info-soft", color: "text-info" },
} as const;

export function InsightsCard({ insights }: { insights: InsightView[] }) {
  const { t } = useI18n();
  return (
    <section className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary-soft/60 via-surface to-surface p-4 shadow-xs">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft">
          <Sparkles className="size-4 text-primary" />
        </span>
        <div>
          <h2 className="text-[14px] font-semibold tracking-[-0.01em]">{t("insights.title")}</h2>
          <p className="text-[11.5px] text-muted-foreground">{t("insights.subtitle")}</p>
        </div>
      </div>
      <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((ins, idx) => {
          const tone = TONES[ins.tone];
          const Icon = ICONS[ins.icon] ?? Sparkles;
          const content = (
            <div className={`flex h-full items-start gap-2.5 rounded-xl border ${tone.border} ${tone.bg} px-3.5 py-2.5 transition-shadow hover:shadow-xs ${ins.href ? "cursor-pointer" : ""}`}>
              <Icon className={`mt-0.5 size-4 shrink-0 ${tone.color}`} strokeWidth={2} />
              <div className="min-w-0">
                <p className={`text-[12.5px] font-semibold leading-5 ${tone.color}`}>{ins.title}</p>
                <p className="mt-0.5 text-[12px] leading-5 text-muted-foreground">{ins.body}</p>
              </div>
            </div>
          );
          return <li key={idx}>{ins.href ? <Link href={ins.href} className="block h-full">{content}</Link> : content}</li>;
        })}
      </ul>
    </section>
  );
}
