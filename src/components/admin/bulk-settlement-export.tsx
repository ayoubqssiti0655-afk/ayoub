"use client";

import * as React from "react";
import { FileSpreadsheet, Download, CheckCircle2, AlertTriangle, Building, ArrowDownToLine, Landmark } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getBulkSettlementExportDataAction } from "@/server/admin-actions";
import { useToast } from "@/components/ui/toast";

export type MerchantPayoutRow = {
  merchantId: string;
  merchantName: string;
  phone: string;
  city: string;
  amountCentimes: number;
  amountDh: number;
  hasRib: boolean;
  bankName: string;
  rib: string;
  accountHolder: string;
};

export function BulkSettlementExport({
  initialRows,
  enabled = true,
}: {
  initialRows: MerchantPayoutRow[];
  enabled?: boolean;
}) {
  const { t, money } = useI18n();
  const toast = useToast();
  const [rows, setRows] = React.useState<MerchantPayoutRow[]>(initialRows);
  const [busy, setBusy] = React.useState(false);

  if (!enabled) return null;

  const totalPayable = rows.reduce((a, b) => a + b.amountCentimes, 0);
  const readyWithRib = rows.filter((r) => r.hasRib && r.rib.replace(/\D/g, "").length === 24);

  function exportBankFile(bankType: "STANDARD" | "CIH" | "ATTIJARI") {
    if (readyWithRib.length === 0) {
      toast.push({ title: "لا يوجد تجار بحسابات بنكية (RIB) مكتملة للتصدير", variant: "error" });
      return;
    }

    const dateStr = new Date().toISOString().split("T")[0];
    let content = "RIB_BENEFICIAIRE,NOM_BENEFICIAIRE,MONTANT_MAD,MOTIF_VIREMENT,DATE\n";

    readyWithRib.forEach((r) => {
      const cleanRib = r.rib.replace(/\D/g, "");
      const name = r.accountHolder || r.merchantName;
      const motif = `REGLEMENT COD ${r.merchantName.slice(0, 15)} ${dateStr}`;
      content += `"${cleanRib}","${name.replace(/"/g, '""')}",${r.amountDh.toFixed(2)},"${motif}","${dateStr}"\n`;
    });

    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `VIREMENTS_MARCHANDS_${bankType}_${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.push({
      title: `تم تحميل ملف التحويلات (${readyWithRib.length} تاجر) بنجاح`,
      variant: "success",
    });
  }

  return (
    <div className="rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-500/10 via-surface to-surface p-4 sm:p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400">
            <FileSpreadsheet className="size-5" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-foreground">
              {t("features.f.admin_bank_settlement_export.name")}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              توليد ملفات التحويلات البنكية الموحدة (CIH / Attijariwafa / BCP) لصرف الأرباح بنقرة واحدة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => exportBankFile("STANDARD")}
            disabled={readyWithRib.length === 0}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[12px] shadow-sm gap-1.5"
          >
            <Download className="size-3.5" />
            <span>تصدير ملف البنك ({readyWithRib.length})</span>
          </Button>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            إجمالي المستحقين: <strong className="text-foreground">{rows.length} تاجر</strong>
          </span>
          <span className="text-muted-foreground">
            المجموع: <strong className="text-primary tnum">{money(totalPayable)}</strong>
          </span>
          <span className="text-muted-foreground">
            حسابات جاهزة للتحويل: <strong className="text-emerald-600 dark:text-emerald-400">{readyWithRib.length}</strong>
          </span>
        </div>

        {rows.length - readyWithRib.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-warning font-semibold">
            <AlertTriangle className="size-3.5" /> {rows.length - readyWithRib.length} تجار لم يسجلوا RIB بعد
          </span>
        )}
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
        <div className="max-h-60 overflow-y-auto">
          <table className="w-full text-start text-[12px]">
            <thead className="sticky top-0 bg-surface-2 text-muted-foreground border-b border-border text-[11.5px]">
              <tr>
                <th className="py-2.5 px-3 text-start font-semibold">التاجر</th>
                <th className="py-2.5 px-3 text-start font-semibold">البنك</th>
                <th className="py-2.5 px-3 text-start font-semibold">رقم الـ RIB (24 رقم)</th>
                <th className="py-2.5 px-3 text-end font-semibold">المبلغ المستحق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground text-[12.5px]">
                    لا توجد مستحقات سحب تفوق 200 درهم في الوقت الحالي
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.merchantId} className="hover:bg-surface-2 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-foreground">
                      {r.merchantName}
                      <span className="block text-[10.5px] font-normal text-muted-foreground">{r.city}</span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{r.bankName}</td>
                    <td className="py-2.5 px-3">
                      {r.hasRib ? (
                        <span className="font-mono text-[11px] text-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                          {r.rib.slice(0, 7)}...{r.rib.slice(-4)}
                        </span>
                      ) : (
                        <Badge tone="warning" className="text-[11px] px-1.5 py-0">بانتظار الـ RIB</Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-end font-bold text-primary tnum">
                      {money(r.amountCentimes)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
