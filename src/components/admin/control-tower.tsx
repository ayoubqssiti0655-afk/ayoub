"use client";

import * as React from "react";
import { RadioTower, Bike, AlertTriangle, Clock, Wallet, MapPin, RefreshCw, ChevronRight, Phone } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeliveryMap, type MapPoint } from "@/components/map";

export type CourierLiveInfo = {
  id: string;
  name: string;
  phone: string;
  code: string;
  city: string;
  lat: number | null;
  lng: number | null;
  lastSeenAt: string | null;
  assignedCount: number;
  deliveredCount: number;
  remainingCount: number;
  cashInHand: number;
};

export type RiskAlert = {
  id: string;
  type: "IDLE_COURIER" | "HIGH_CASH" | "REPEATED_FAIL";
  title: string;
  desc: string;
  time: string;
  severity: "high" | "medium";
};

export function ControlTower({
  couriers,
  alerts,
  enabled = true,
}: {
  couriers: CourierLiveInfo[];
  alerts: RiskAlert[];
  enabled?: boolean;
}) {
  const { t, money, rel } = useI18n();
  const [selectedCourier, setSelectedCourier] = React.useState<CourierLiveInfo | null>(couriers[0] ?? null);

  if (!enabled) return null;

  // Build map points for couriers
  const mapPoints: MapPoint[] = couriers
    .filter((c) => c.lat != null && c.lng != null)
    .map((c) => ({
      lat: c.lat!,
      lng: c.lng!,
      label: c.name[0],
      color: c.remainingCount > 0 ? "#2F45E0" : "#10B981",
    }));

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-surface to-surface p-4 sm:p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <RadioTower className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-foreground">
                {t("features.f.admin_control_tower.name")}
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground">
              مراقبة الميدان، حركة الموزعين، ورادار الإنذارات التشغيلية في الوقت الفعلي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
          <span className="rounded-lg bg-surface border border-border px-2.5 py-1">
            <Bike className="inline size-3.5 me-1.5 text-primary" />
            <strong className="text-foreground">{couriers.length}</strong> موزع نشط
          </span>
          <Button size="sm" variant="outline" className="h-8 gap-1 text-[11.5px]" onClick={() => window.location.reload()}>
            <RefreshCw className="size-3" />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* Real-time Alerts Ticker if any */}
      {alerts.length > 0 && (
        <div className="mt-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-warning">
            <AlertTriangle className="size-3.5" />
            <span>إنذارات الميدان الحية ({alerts.length}) :</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.slice(0, 3).map((a) => (
              <div
                key={a.id}
                className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-[11.5px] ${
                  a.severity === "high"
                    ? "border-error/30 bg-error/10 text-error-foreground"
                    : "border-warning/30 bg-warning/10 text-warning-foreground"
                }`}
              >
                <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${a.severity === "high" ? "text-error" : "text-warning"}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground truncate">{a.title}</p>
                  <p className="text-muted-foreground text-[11px] leading-snug">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Live Map + Couriers List */}
      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        {/* Map Section */}
        <div className="lg:col-span-8 overflow-hidden rounded-xl border border-border bg-surface">
          {mapPoints.length > 0 ? (
            <DeliveryMap points={mapPoints} height={310} zoom={12} />
          ) : (
            <div className="flex h-[310px] flex-col items-center justify-center p-6 text-center text-muted-foreground">
              <MapPin className="size-8 text-faint mb-2" />
              <p className="text-[13px] font-medium">لا توجد إحداثيات GPS مباشرة مسجلة للموزعين حالياً</p>
              <p className="text-[11.5px] text-faint mt-0.5">يتم تحديث الموقع تلقائياً بمجرد فتح الموزع للتطبيق وبدء جولته</p>
            </div>
          )}
        </div>

        {/* Active Couriers Live Cards */}
        <div className="lg:col-span-4 flex flex-col gap-2 max-h-[310px] overflow-y-auto pe-1">
          {couriers.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-border bg-surface p-4 text-center text-muted-foreground text-[12.5px]">
              لا يوجد موزعين نشطين في الخدمة الآن
            </div>
          ) : (
            couriers.map((c) => {
              const isSelected = selectedCourier?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCourier(c)}
                  className={`cursor-pointer rounded-xl border p-2.5 transition-all text-[12px] ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-surface hover:border-primary/40 hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-[12px] font-bold text-primary">
                        {c.name[0]}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">{c.name}</p>
                        <p className="text-[10.5px] text-muted-foreground">{c.city} · {c.code}</p>
                      </div>
                    </div>

                    <span className="shrink-0 text-[11px] font-bold tnum text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md">
                      {money(c.cashInHand, { compact: true })}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                    <span>
                      سلم <strong className="text-foreground">{c.deliveredCount}</strong> · متبقي <strong className="text-foreground">{c.remainingCount}</strong>
                    </span>
                    <a
                      href={`tel:${c.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                    >
                      <Phone className="size-3" />
                      اتصال
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

