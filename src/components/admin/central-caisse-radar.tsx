"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Landmark, CheckCircle2, Wallet, ArrowRight, ShieldCheck, Banknote, AlertCircle, RefreshCw } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { bulkApproveDepositsAction } from "@/server/admin-actions";

export type CaisseRadarData = {
  cashInStreet: number;
  pendingCaisseDeposits: number;
  pendingDepositsCount: number;
  vaultCashToday: number;
  merchantsPayable: number;
};

export function CentralCaisseRadar({
  data,
  enabled = true,
}: {
  data: CaisseRadarData;
  enabled?: boolean;
}) {
  const { t, money } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  if (!enabled) return null;

  async function handleBulkApprove() {
    if (!confirm(`هل أنت متأكد من اعتماد جميع الإيداعات المعلقة (${data.pendingDepositsCount} إيداع بمجموع ${money(data.pendingCaisseDeposits)}) وتحرير الأرصدة للتجار؟`)) {
      return;
    }
    setBusy(true);
    const res = await bulkApproveDepositsAction();
    setBusy(false);
    if (res.ok) {
      toast.push({
        title: `تم اعتماد ${res.data?.count ?? 0} إيداع بنجاح وتحرير مستحقات التجار`,
        variant: "success",
      });
      router.refresh();
    } else {
      toast.push({ title: res.message ?? "حدث خطأ أثناء الاعتماد", variant: "error" });
    }
  }

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-surface to-surface p-4 sm:p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Landmark className="size-5" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-foreground">
              {t("features.f.admin_central_caisse.name")}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              متابعة سيولة الشركة، الكاش المتنقل، واعتماد تسليمات الموزعين بضغطة زر
            </p>
          </div>
        </div>

        {data.pendingDepositsCount > 0 && (
          <Button
            size="sm"
            onClick={handleBulkApprove}
            disabled={busy}
            className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[12px] shadow-sm gap-1.5"
          >
            <CheckCircle2 className="size-3.5" />
            <span>اعتماد كل إيداعات اليوم ({data.pendingDepositsCount})</span>
          </Button>
        )}
      </div>

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
            <span className="text-[11.5px] font-semibold text-amber-700 dark:text-amber-300">صرّح بها الموزع (قيد الاعتماد)</span>
            <AlertCircle className="size-4 text-amber-600" />
          </div>
          <p className="mt-1.5 text-[20px] font-extrabold text-amber-600 dark:text-amber-400 tnum">
            {money(data.pendingCaisseDeposits)}
          </p>
          <p className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-300/80">
            {data.pendingDepositsCount} إيداع بانتظار موافقة الصندوق
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
            <span className="text-[11.5px] font-semibold text-muted-foreground">مستحقات التجار (جاهزة للسحب)</span>
            <Wallet className="size-4 text-primary" />
          </div>
          <p className="mt-1.5 text-[20px] font-extrabold text-primary tnum">
            {money(data.merchantsPayable)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">أرصدة متاحة للتسوية البنكية</p>
        </div>
      </div>
    </div>
  );
}

