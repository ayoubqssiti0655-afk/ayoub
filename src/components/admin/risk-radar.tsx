"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldAlert, AlertTriangle, Phone, MessageCircle, CheckCircle2, ChevronRight, UserX } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { waLink } from "@/lib/format";

export type HighRiskOrder = {
  orderId: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  city: string;
  total: number;
  codAmount: number;
  riskReason: string;
  previousFailedCount: number;
  previousDeliveredCount: number;
  riskLevel: "HIGH" | "MEDIUM";
};

export function RiskRadar({
  orders,
  enabled = true,
}: {
  orders: HighRiskOrder[];
  enabled?: boolean;
}) {
  const { t, money } = useI18n();

  if (!enabled) return null;

  return (
    <div className="rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-surface to-surface p-4 sm:p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-foreground">
                {t("features.f.admin_risk_radar.name")}
              </h2>
              {orders.length > 0 && (
                <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[11px] font-extrabold text-rose-600 dark:text-rose-400">
                  {orders.length} طرد مشبوه
                </span>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground">
              رصد الطلبيات ذات احتمالية الإلغاء العالية بناءً على سجل الزبون لتفادي خسائر التوصيل المهدور
            </p>
          </div>
        </div>

        <span className="text-[12px] text-muted-foreground font-medium">
          معدل الأمان: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{orders.length === 0 ? "100%" : "تتطلب تأكيد"}</strong>
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="mt-3.5 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-[12.5px] text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <p className="font-bold">رادار الأمان ممتاز — لا توجد طرود مشبوهة أو زبائن ذوي سوابق رفض حالياً.</p>
            <p className="text-[11.5px] opacity-80 mt-0.5">جميع الطلبيات الجديدة تملك مؤشرات تسليم آمنة وموثوقة.</p>
          </div>
        </div>
      ) : (
        <div className="mt-3.5 space-y-2.5">
          {orders.slice(0, 5).map((o) => (
            <div
              key={o.orderId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-surface p-3 transition-colors hover:bg-surface-2"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  <UserX className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/orders/${o.orderId}`} className="font-bold text-[13px] text-foreground hover:text-primary hover:underline tnum">
                      {o.reference}
                    </Link>
                    <Badge tone={o.riskLevel === "HIGH" ? "error" : "warning"} className="text-[11px] px-1.5 py-0">
                      {o.riskLevel === "HIGH" ? "خطورة مرتفعة" : "خطورة متوسطة"}
                    </Badge>
                  </div>
                  <p className="text-[12px] text-foreground mt-0.5">
                    {o.customerName} · <span className="text-muted-foreground">{o.city}</span> · <strong className="text-primary tnum">{money(o.codAmount)}</strong>
                  </p>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">
                    ⚠️ {o.riskReason} ({o.previousFailedCount} إلغاء سابق مقابل {o.previousDeliveredCount} استلام)
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`tel:${o.customerPhone}`}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 text-[11.5px] font-semibold hover:bg-surface-2"
                >
                  <Phone className="size-3 text-primary" />
                  اتصال للتأكيد
                </a>
                <a
                  href={waLink(o.customerPhone, `السلام عليكم ${o.customerName}، معكم إدارة التوصيل بخصوص طلبيتكم ${o.reference}. نود تأكيد موعد الاستلام والعنوان قبل إرسال الموزع إليكم.`)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-[11.5px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                >
                  <MessageCircle className="size-3" />
                  واتساب
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
