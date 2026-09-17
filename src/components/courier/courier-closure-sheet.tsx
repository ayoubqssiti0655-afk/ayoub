"use client";

import * as React from "react";
import QRCode from "qrcode";
import { CheckCircle2, FileSpreadsheet, Printer, QrCode, RotateCcw, ShieldCheck, Wallet, X } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";

export type ClosureData = {
  courierName: string;
  courierCode?: string;
  deliveredCount: number;
  returnedCount: number;
  postponedCount: number;
  totalAssigned: number;
  codCollected: number;
  expensesTotal: number;
  netDue: number;
};

export function CourierClosureSheet({
  data,
  enabled = true,
}: {
  data: ClosureData;
  enabled?: boolean;
}) {
  const { t, money } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [qrUrl, setQrUrl] = React.useState<string | null>(null);

  const todayStr = new Intl.DateTimeFormat("fr-MA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  React.useEffect(() => {
    if (!open) return;
    const payload = JSON.stringify({
      type: "HUB_CLOSURE",
      courier: data.courierName,
      delivered: data.deliveredCount,
      returns: data.returnedCount,
      cod: data.codCollected / 100,
      expenses: data.expensesTotal / 100,
      net: data.netDue / 100,
      date: new Date().toISOString().split("T")[0],
    });

    QRCode.toDataURL(payload, {
      margin: 1,
      width: 180,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then(setQrUrl).catch(() => {});
  }, [open, data]);

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary-soft p-3.5 text-[13.5px] font-bold text-primary transition-all hover:bg-primary-soft/80 shadow-xs"
      >
        <FileSpreadsheet className="size-4" />
        <span>{t("courier.closure.button")}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-fade-in">
          <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-surface p-6 shadow-2xl animate-zoom-in">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute end-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>

            {/* Print Header */}
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11.5px] font-bold text-primary">
                <ShieldCheck className="size-3.5" /> وثيقة رسمية لنهاية الجولة
              </span>
              <h2 className="mt-2 text-[18px] font-bold tracking-tight">
                {t("courier.closure.title")}
              </h2>
              <p className="text-[12px] text-muted-foreground">
                الموزع: <strong className="text-foreground">{data.courierName}</strong> · {todayStr}
              </p>
            </div>

            {/* Metrics Breakdown */}
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-success/30 bg-success-soft/30 p-2.5">
                <p className="text-[11px] font-medium text-success">{t("courier.closure.deliveredCount")}</p>
                <p className="mt-0.5 text-[18px] font-extrabold text-success tnum">{data.deliveredCount}</p>
              </div>

              <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-2.5">
                <p className="text-[11px] font-medium text-violet-600 dark:text-violet-400">{t("courier.closure.returnedCount")}</p>
                <p className="mt-0.5 text-[18px] font-extrabold text-violet-600 dark:text-violet-400 tnum">{data.returnedCount}</p>
              </div>

              <div className="rounded-xl border border-warning-soft bg-warning-soft/30 p-2.5">
                <p className="text-[11px] font-medium text-warning">{t("courier.closure.postponedCount")}</p>
                <p className="mt-0.5 text-[18px] font-extrabold text-warning tnum">{data.postponedCount}</p>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="mt-4 rounded-2xl border border-border bg-surface-2 p-4">
              <div className="flex items-center justify-between text-[13px] text-muted-foreground pb-2 border-b border-border/60">
                <span>مجموع الكاش المقبوض (COD):</span>
                <span className="font-bold text-foreground tnum">{money(data.codCollected)}</span>
              </div>
              <div className="flex items-center justify-between text-[13px] text-muted-foreground py-2 border-b border-border/60">
                <span>مصاريف الوقود والركن المعتمدة:</span>
                <span className="font-bold text-error tnum">
                  {data.expensesTotal > 0 ? `−${money(data.expensesTotal)}` : "0.00 DH"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[15px] pt-2 font-bold">
                <span className="text-emerald-700 dark:text-emerald-300">الصافي الواجب تسليمه للمستودع:</span>
                <span className="text-[19px] font-extrabold text-emerald-600 dark:text-emerald-400 tnum">
                  {money(data.netDue)}
                </span>
              </div>
            </div>

            {/* QR Code for Hub Verification */}
            <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-center">
              <p className="text-[12.5px] font-bold text-foreground">{t("courier.closure.qrTitle")}</p>
              <p className="mt-0.5 max-w-xs text-[11px] text-muted-foreground leading-relaxed">
                {t("courier.closure.qrDesc")}
              </p>

              {qrUrl ? (
                <div className="mt-3 rounded-xl border border-border bg-white p-2 shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="Hub verification QR" className="size-36" />
                </div>
              ) : (
                <div className="mt-3 size-36 animate-pulse rounded-xl bg-muted" />
              )}
            </div>

            {/* Print button */}
            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl font-semibold"
                onClick={() => window.print()}
              >
                <Printer className="size-3.5" />
                <span>طباعة الوثيقة</span>
              </Button>
              <Button
                className="flex-1 rounded-xl font-bold"
                onClick={() => setOpen(false)}
              >
                {t("common.close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

