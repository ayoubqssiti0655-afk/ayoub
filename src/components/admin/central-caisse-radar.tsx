"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Landmark, CheckCircle2, Wallet, ShieldCheck, Banknote, AlertCircle,
  Clock, User, Phone, Image as ImageIcon, ArrowRight,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { bulkApproveDepositsAction, setDepositStatusAction } from "@/server/admin-actions";

export type PendingDepositItem = {
  id: string;
  courierId: string;
  courierName: string;
  courierPhone: string;
  amount: number;
  expectedAmount: number;
  difference: number;
  declaredAt: string;
  note: string | null;
  proofPhoto: string | null;
};

export type CaisseRadarData = {
  cashInStreet: number;
  pendingCaisseDeposits: number;
  pendingDepositsCount: number;
  vaultCashToday: number;
  merchantsPayable: number;
  pendingList?: PendingDepositItem[];
};

export function CentralCaisseRadar({
  data,
  enabled = true,
}: {
  data: CaisseRadarData;
  enabled?: boolean;
}) {
  const { t, money, dateTime, rel } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);

  if (!enabled) return null;

  async function handleBulkApprove() {
    if (
      !confirm(
        `هل أنت متأكد من اعتماد جميع الإيداعات المعلقة (${data.pendingDepositsCount} إيداع بمجموع ${money(data.pendingCaisseDeposits)}) وتحرير الأرصدة للتجار؟`
      )
    ) {
      return;
    }
    setBusy("BULK");
    const res = await bulkApproveDepositsAction();
    setBusy(null);
    if (res.ok) {
      toast.push({
        title: `تم اعتماد ${res.data?.count ?? 0} إيداع بنجاح وتحرير مستحقات التجار في محافظهم`,
        variant: "success",
      });
      router.refresh();
    } else {
      toast.push({ title: res.message ?? "حدث خطأ أثناء الاعتماد", variant: "error" });
    }
  }

  async function handleSingleApprove(depositId: string, courierName: string, amount: number) {
    setBusy(depositId);
    const res = await setDepositStatusAction(depositId, "VERIFIED");
    setBusy(null);
    if (res.ok) {
      toast.push({
        title: `تم تأكيد إيداع ${courierName} بمبلغ ${money(amount)} وتحرير الرصيد للتاجر للسحب`,
        variant: "success",
      });
      router.refresh();
    } else {
      toast.push({ title: res.message ?? "حدث خطأ", variant: "error" });
    }
  }

  const pendingList = data.pendingList ?? [];

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-surface to-surface p-4 sm:p-5 shadow-xs">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Landmark className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-foreground">
                {t("features.f.admin_central_caisse.name")}
              </h2>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10.5px] font-bold text-amber-700 dark:text-amber-300">
                بروتوكول الصندوق المزدوج (Livreur ➔ Admin ➔ Marchand)
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              متابعة سيولة الشركة، ومراجعة إيداعات الموزعين واعتمادها لتصل إلى محافظ التجار للسحب
            </p>
          </div>
        </div>

        {data.pendingDepositsCount > 0 && (
          <Button
            size="sm"
            onClick={handleBulkApprove}
            disabled={busy !== null}
            className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[12px] shadow-sm gap-1.5"
          >
            <CheckCircle2 className="size-3.5" />
            <span>اعتماد كل إيداعات اليوم دفعة واحدة ({data.pendingDepositsCount})</span>
          </Button>
        )}
      </div>

      {/* 4 Financial KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* 1. Cash in Street */}
        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-muted-foreground">الكاش في الشارع (مع الموزعين)</span>
            <Banknote className="size-4 text-primary" />
          </div>
          <p className="mt-1.5 text-[20px] font-extrabold text-foreground tnum">
            {money(data.cashInStreet)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">مبالغ COD قيد التسليم حالياً</p>
        </div>

        {/* 2. Pending Caisse Approvals */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-amber-700 dark:text-amber-300">صرّح بها الموزع (قيد اعتماد الإدارة)</span>
            <AlertCircle className="size-4 text-amber-600" />
          </div>
          <p className="mt-1.5 text-[20px] font-extrabold text-amber-600 dark:text-amber-400 tnum">
            {money(data.pendingCaisseDeposits)}
          </p>
          <p className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-300/80">
            {data.pendingDepositsCount} إيداع بانتظار موافقة الإدارة للتحرير للتاجر
          </p>
        </div>

        {/* 3. In Central Vault */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-emerald-700 dark:text-emerald-300">في الخزينة المركزية اليوم</span>
            <ShieldCheck className="size-4 text-emerald-600" />
          </div>
          <p className="mt-1.5 text-[20px] font-extrabold text-emerald-600 dark:text-emerald-400 tnum">
            {money(data.vaultCashToday)}
          </p>
          <p className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-300/80">كاش تم استلامه وتأكيده اليوم</p>
        </div>

        {/* 4. Merchants Payable */}
        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-muted-foreground">مستحقات التجار (متاحة للسحب)</span>
            <Wallet className="size-4 text-primary" />
          </div>
          <p className="mt-1.5 text-[20px] font-extrabold text-primary tnum">
            {money(data.merchantsPayable)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">محررة بالمحافظ وجاهزة للتحويل البنكي</p>
        </div>
      </div>

      {/* Pending Deposits Interactive List */}
      {pendingList.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-surface p-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-border/70">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-amber-600" />
              <h3 className="text-[13px] font-bold text-foreground">
                طلبات إيداع الموزعين في الخزينة ({pendingList.length}) :
              </h3>
            </div>
            <span className="text-[11px] text-muted-foreground">
              بمجرد نقر "اعتماد"، يتحول الرصيد مباشرة إلى محفظة التاجر ليتمكن من سحبه
            </span>
          </div>

          <div className="mt-2.5 space-y-2">
            {pendingList.map((dep) => (
              <div
                key={dep.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 p-3 transition-colors hover:border-amber-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    <User className="size-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[13.5px] text-foreground">{dep.courierName}</span>
                      {dep.courierPhone && (
                        <span className="text-[11px] text-muted-foreground" dir="ltr">
                          {dep.courierPhone}
                        </span>
                      )}
                      <span className="text-[11px] text-faint">· {rel(dep.declaredAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11.5px] text-muted-foreground">
                      <span>
                        المبلغ المصرح به: <strong className="text-foreground tnum">{money(dep.amount)}</strong>
                      </span>
                      {dep.expectedAmount > 0 && (
                        <span>
                          (المتوقع: <span className="tnum">{money(dep.expectedAmount)}</span>)
                        </span>
                      )}
                      {dep.difference !== 0 && (
                        <Badge tone={dep.difference > 0 ? "success" : "error"} className="text-[10px] px-1 py-0">
                          {dep.difference > 0 ? `+${money(dep.difference)}` : money(dep.difference)}
                        </Badge>
                      )}
                    </div>
                    {dep.note && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 italic">“{dep.note}”</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {dep.proofPhoto && (
                    <a
                      href={dep.proofPhoto}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-[11.5px] font-semibold text-foreground hover:bg-muted"
                    >
                      <ImageIcon className="size-3.5 text-primary" />
                      <span>معاينة الوصل</span>
                    </a>
                  )}

                  <Button
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => handleSingleApprove(dep.id, dep.courierName, dep.amount)}
                    className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11.5px] shadow-xs gap-1.5"
                  >
                    <CheckCircle2 className="size-3.5" />
                    <span>اعتماد وتحرير للتاجر</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
