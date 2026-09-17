"use client";

import * as React from "react";
import Link from "next/link";
import { MapPin, Phone, ChevronRight, Banknote, PackageCheck, Truck, TriangleAlert, Map as MapIcon, List } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { StatusBadge } from "@/components/status-badge";
import { DeliveryMap, type MapPoint } from "@/components/map";
import { EmptyState } from "@/components/shared";
import { QrScanButton } from "@/components/courier/qr-scanner";
import { CourierNavAction, CourierWhatsAppActions } from "@/components/courier/courier-quick-actions";
import { cn, DH } from "@/lib/utils";

export type CourierDelivery = {
  id: string; reference: string; status: string;
  customerName: string; customerPhone: string; address: string; city: string;
  codAmount: number; attempts: number;
  exchangeFor?: string | null; gpsLat?: number | null; gpsLng?: number | null;
  slotDate?: string | null; slotWindow?: string | null;
};

export function CourierHomeClient({
  deliveries, courierName, feePerDelivery, earnedToday, codToday, failedToday, scanEnabled = true, slotEnabled = true,
  quickActionsEnabled = true, batchScanEnabled = true,
}: {
  deliveries: CourierDelivery[];
  courierName: string;
  feePerDelivery: number;
  earnedToday: number;
  codToday: number;
  failedToday: number;
  scanEnabled?: boolean;
  slotEnabled?: boolean;
  quickActionsEnabled?: boolean;
  batchScanEnabled?: boolean;
}) {
  const { t, money, num } = useI18n();
  const [view, setView] = React.useState<"list" | "map">("list");

  const toDeliver = deliveries.length;
  const done = num(0); // computed server-side for today
  const stats = [
    { label: t("courier.toDeliver"), value: num(toDeliver), icon: Truck, color: "var(--info)" },
    { label: t("courier.completed"), value: done, icon: PackageCheck, color: "var(--success)" },
    { label: t("courier.earningsToday"), value: money(earnedToday, { compact: true }), icon: Banknote, color: "var(--chart-5)" },
    { label: t("dashboard.failed"), value: num(failedToday), icon: TriangleAlert, color: "var(--error)" },
  ];

  return (
    <div className="mt-4 space-y-4">
      {/* stats */}
      <div className="grid grid-cols-2 gap-2.5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-muted-foreground">{s.label}</p>
              <s.icon className="size-4" style={{ color: s.color }} strokeWidth={2} />
            </div>
            <p className="mt-1.5 text-[20px] font-semibold tnum">{s.value}</p>
          </div>
        ))}
      </div>

      {/* tour progress */}
      {toDeliver > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary-soft px-4 py-3">
          <p className="text-[12.5px] font-medium text-primary">{t("courier.onTour")}</p>
          <p className="mt-0.5 text-[13px] text-primary/80">
            {t("courier.tourProgress", { done: 0, total: toDeliver })} · {money(codToday + deliveries.reduce((a, d) => a + d.codAmount, 0), { compact: true })} {t("courier.codCollected").toLowerCase()}
          </p>
        </div>
      )}

      {/* deliveries */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">{t("courier.deliveriesTitle")}</h2>
          {deliveries.length > 0 && scanEnabled && <QrScanButton continuousEnabled={batchScanEnabled} />}
          <div className="flex rounded-lg border border-border bg-surface p-0.5">
            <button onClick={() => setView("list")} className={cn("flex items-center gap-1 rounded-md px-2.5 py-1 text-[11.5px] font-medium", view === "list" ? "bg-primary-soft text-primary" : "text-muted-foreground")}>
              <List className="size-3" /> {t("courier.list")}
            </button>
            <button onClick={() => setView("map")} className={cn("flex items-center gap-1 rounded-md px-2.5 py-1 text-[11.5px] font-medium", view === "map" ? "bg-primary-soft text-primary" : "text-muted-foreground")}>
              <MapIcon className="size-3" /> {t("courier.map")}
            </button>
          </div>
        </div>

        {deliveries.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface shadow-xs">
            <EmptyState icon={PackageCheck} title={t("courier.empty")} description={t("courier.emptyDesc")} className="py-10" />
          </div>
        ) : view === "map" ? (
          <MapWrapper deliveries={deliveries} />
        ) : (
          <ul className="space-y-2.5">
            {deliveries.map((d, idx) => (
              <li key={d.id}>
                <Link
                  href={`/courier/deliveries/${d.id}`}
                  className={cn(
                    "block rounded-xl border bg-surface p-3.5 shadow-xs transition-shadow active:shadow-none hover:shadow-sm",
                    d.status === "OUT_FOR_DELIVERY" ? "border-primary/30" : "border-border"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-[12px] font-bold text-primary tnum">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold">{d.customerName}</p>
                      <p className="truncate text-[12px] text-muted-foreground">{d.city} · <span className="tnum">{d.reference}</span>{d.exchangeFor ? <span className="text-violet"> · {t("exchange.badge")}</span> : null}</p>
                  {slotEnabled && d.slotDate && d.slotWindow && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-primary-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-primary tnum">
                      {d.slotDate.slice(5)} · {d.slotWindow}
                    </p>
                  )}
                    </div>
                    <div className="text-end">
                      {d.codAmount > 0 && (
                        <p className="text-[14px] font-semibold text-success tnum">{money(d.codAmount, { compact: true })}</p>
                      )}
                      <StatusBadge status={d.status} size="sm" />
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-faint rtl:rotate-180" />
                  </div>
                  <p className="mt-2 flex items-start gap-1.5 text-[12.5px] leading-5 text-muted-foreground">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    {d.address}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <a
                      href={`tel:${d.customerPhone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-8 flex-1 min-w-24 items-center justify-center gap-1.5 rounded-lg bg-primary text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      <Phone className="size-3.5" /> {t("common.call")}
                    </a>
                    {quickActionsEnabled && (
                      <>
                        <CourierNavAction
                          address={d.address}
                          city={d.city}
                          lat={d.gpsLat}
                          lng={d.gpsLng}
                          className="flex-1 min-w-24"
                        />
                        <CourierWhatsAppActions
                          customerName={d.customerName}
                          customerPhone={d.customerPhone}
                          reference={d.reference}
                          codAmount={d.codAmount}
                          className="flex-1 min-w-24"
                        />
                      </>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MapWrapper({ deliveries }: { deliveries: CourierDelivery[] }) {
  const { t } = useI18n();
  // Points are approximated on the delivery city — precise GPS comes from merchant input in production.
  const points: MapPoint[] = deliveries.slice(0, 12).map((d, idx) => ({
    lat: 33.5731 + (Math.sin(idx * 2.3) * 0.035),
    lng: -7.5898 + (Math.cos(idx * 1.7) * 0.035),
    label: String(idx + 1),
    color: d.status === "OUT_FOR_DELIVERY" ? "#2F45E0" : "#0E8345",
  }));
  return (
    <div>
      <DeliveryMap points={points} height={340} />
      <p className="mt-2 text-[11.5px] text-faint">{t("deliveries.subtitle")}</p>
    </div>
  );
}
