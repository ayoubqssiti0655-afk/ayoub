"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Wand2, Truck, CheckCircle2, ArrowRight, Layers, MapPin } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { smartDispatchMorningAction } from "@/server/admin-actions";

export type CityPendingDispatch = {
  city: string;
  unassignedCount: number;
  availableCouriersCount: number;
};

export function SmartDispatcher({
  cityStats,
  totalUnassigned,
  enabled = true,
}: {
  cityStats: CityPendingDispatch[];
  totalUnassigned: number;
  enabled?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  if (!enabled) return null;

  async function handleDispatch(city?: string) {
    setBusy(true);
    const res = await smartDispatchMorningAction(city ? { city } : undefined);
    setBusy(false);
    if (res.ok) {
      toast.push({
        title: `تم إسناد ${res.data?.count ?? 0} طرد تلقائياً للموزعين حسب المناطق بنجاح`,
        variant: "success",
      });
      router.refresh();
    } else {
      toast.push({ title: res.message ?? "تعذر التوزيع الذكي", variant: "error" });
    }
  }

  return (
    <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-500/10 via-surface to-surface p-4 sm:p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-foreground">
                {t("features.f.admin_smart_dispatch.name")}
              </h2>
              {totalUnassigned > 0 && (
                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[11px] font-extrabold text-purple-600 dark:text-purple-400">
                  {totalUnassigned} طرد جاهز
                </span>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground">
              توزيع وفرز طرود الصباح تلقائياً وإسنادها للموزعين الأقرب جغرافياً لتوفير 40% من الوقت
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => handleDispatch()}
          disabled={busy || totalUnassigned === 0}
          className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[12px] shadow-sm gap-1.5"
        >
          <Wand2 className="size-3.5" />
          <span>توزيع كل طرود الصباح الآن ({totalUnassigned})</span>
        </Button>
      </div>

      <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {cityStats.length === 0 ? (
          <div className="col-span-full py-4 text-center text-muted-foreground text-[12.5px]">
            جميع الطرود المؤكدة مسندة لموزعيها بالفعل — لا توجد طرود معلقة بانتظار التوزيع.
          </div>
        ) : (
          cityStats.map((c) => (
            <div
              key={c.city}
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 transition-all hover:border-purple-500/40"
            >
              <div>
                <div className="flex items-center gap-1.5 font-bold text-[13px] text-foreground">
                  <MapPin className="size-3.5 text-purple-500" />
                  {c.city}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  <strong className="text-foreground">{c.unassignedCount}</strong> طرد · <span className="text-emerald-600 dark:text-emerald-400">{c.availableCouriersCount} موزع</span>
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => handleDispatch(c.city)}
                className="h-7 text-[11px] rounded-lg border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
              >
                توزيع المدينة
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
