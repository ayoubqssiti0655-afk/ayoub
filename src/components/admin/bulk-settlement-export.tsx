"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet, Download, CheckCircle2, AlertTriangle, Building, ArrowDownToLine,
  Landmark, Edit2, PlusCircle, Copy, Check, ChevronDown, FileText,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminSaveMerchantBankAction, markSettlementPaidAction } from "@/server/admin-actions";
import { useToast } from "@/components/ui/toast";

const MOROCCAN_BANKS = [
  "Attijariwafa bank",
  "Banque Populaire (BCP)",
  "CIH Bank",
  "Bank of Africa (BMCE)",
  "Al Barid Bank",
  "Société Générale Maroc (SGMB)",
  "BMCI",
  "Crédit du Maroc (CDM)",
  "CFG Bank",
  "Autre banque",
];

export type MerchantPayoutRow = {
  id?: string;
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
  source?: "SETTLEMENT_REQUEST" | "WALLET_BALANCE";
  reference?: string;
  settlementId?: string;
  method?: string;
  createdAt?: string;
};

export function BulkSettlementExport({
  initialRows,
  enabled = true,
}: {
  initialRows: MerchantPayoutRow[];
  enabled?: boolean;
}) {
  const { t, money } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = React.useState<MerchantPayoutRow[]>(initialRows);

  // Edit RIB modal state
  const [editingMerchant, setEditingMerchant] = React.useState<MerchantPayoutRow | null>(null);
  const [bankName, setBankName] = React.useState("Attijariwafa bank");
  const [rib, setRib] = React.useState("");
  const [accountHolder, setAccountHolder] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Pay settlement modal state
  const [payingSettlement, setPayingSettlement] = React.useState<MerchantPayoutRow | null>(null);
  const [paymentReference, setPaymentReference] = React.useState("");
  const [paymentNote, setPaymentNote] = React.useState("");
  const [paying, setPaying] = React.useState(false);

  React.useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  if (!enabled) return null;

  const totalPayable = rows.reduce((a, b) => a + b.amountCentimes, 0);
  const readyWithRib = rows.filter((r) => r.hasRib && r.rib.replace(/\D/g, "").length === 24);

  function openEditRib(row: MerchantPayoutRow) {
    setEditingMerchant(row);
    setBankName(row.bankName !== "Non renseigné" ? row.bankName : "Attijariwafa bank");
    setRib(row.rib ?? "");
    setAccountHolder(row.accountHolder || row.merchantName);
  }

  async function handleSaveRib() {
    if (!editingMerchant) return;
    const cleanRib = rib.replace(/\D/g, "");
    if (cleanRib.length !== 24) {
      toast.push({ title: "رقم الـ RIB المغربي يجب أن يتكون من 24 رقماً بالضبط", variant: "error" });
      return;
    }
    if (!accountHolder.trim()) {
      toast.push({ title: "يرجى كتابة اسم صاحب الحساب البنكي", variant: "error" });
      return;
    }

    setSaving(true);
    const res = await adminSaveMerchantBankAction(editingMerchant.merchantId, {
      bankName,
      rib: cleanRib,
      accountHolder: accountHolder.trim(),
    });
    setSaving(false);

    if (res.ok) {
      toast.push({ title: "تم حفظ وتأكيد الحساب البنكي للتاجر بنجاح", variant: "success" });
      setRows((prev) =>
        prev.map((r) =>
          r.merchantId === editingMerchant.merchantId
            ? {
                ...r,
                hasRib: true,
                bankName,
                rib: cleanRib,
                accountHolder: accountHolder.trim(),
              }
            : r
        )
      );
      setEditingMerchant(null);
      router.refresh();
    } else {
      toast.push({ title: res.message ?? "تعذر حفظ الحساب البنكي", variant: "error" });
    }
  }

  async function handleMarkPaid() {
    if (!payingSettlement || !payingSettlement.settlementId) return;
    setPaying(true);
    const res = await markSettlementPaidAction(payingSettlement.settlementId, {
      paymentReference: paymentReference.trim() || undefined,
      paymentNote: paymentNote.trim() || undefined,
    });
    setPaying(false);

    if (res.ok) {
      toast.push({ title: "تم اعتماد وصرف المستحقات للتاجر بنجاح", variant: "success" });
      setRows((prev) => prev.filter((r) => r.settlementId !== payingSettlement.settlementId));
      setPayingSettlement(null);
      setPaymentReference("");
      setPaymentNote("");
      router.refresh();
    } else {
      toast.push({ title: res.message ?? "تعذر اعتماد الدفع", variant: "error" });
    }
  }

  const [copiedRib, setCopiedRib] = React.useState<string | null>(null);

  function copyRib(rawRib: string) {
    const clean = rawRib.replace(/\D/g, "");
    navigator.clipboard.writeText(clean);
    setCopiedRib(clean);
    toast.push({ title: "تم نسخ رقم الـ RIB (24 رقماً) بنجاح", variant: "success" });
    setTimeout(() => setCopiedRib(null), 2500);
  }

  function exportExcelFile() {
    if (readyWithRib.length === 0) {
      toast.push({ title: "لا يوجد تجار بحسابات بنكية (RIB) مكتملة للتصدير", variant: "error" });
      return;
    }

    const dateStr = new Date().toISOString().split("T")[0];

    const data = readyWithRib.map((r) => {
      const cleanRib = r.rib.replace(/\D/g, "");
      const motif = r.reference
        ? `VIREMENT ${r.reference} ${r.merchantName.slice(0, 15)}`
        : `REGLEMENT COD ${r.merchantName.slice(0, 15)}`;

      return {
        "RIB_BENEFICIAIRE (24 Chiffres)": cleanRib,
        "NOM_BENEFICIAIRE": r.accountHolder || r.merchantName,
        "MONTANT_MAD": Number(r.amountDh.toFixed(2)),
        "BANQUE": r.bankName,
        "MOTIF_VIREMENT": motif,
        "REFERENCE": r.reference || "COD",
        "TELEPHONE": r.phone || "",
        "VILLE": r.city || "",
        "DATE": dateStr,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);

    // Force RIB column cells to be explicit strings with text format '@' so Excel NEVER uses scientific notation
    readyWithRib.forEach((r, idx) => {
      const cleanRib = r.rib.replace(/\D/g, "");
      const cellRef = XLSX.utils.encode_cell({ r: idx + 1, c: 0 });
      if (ws[cellRef]) {
        ws[cellRef].t = "s";
        ws[cellRef].v = cleanRib;
        ws[cellRef].z = "@";
      }
    });

    // Set clear column widths
    ws["!cols"] = [
      { wch: 30 }, // RIB
      { wch: 24 }, // Nom
      { wch: 16 }, // Montant
      { wch: 22 }, // Banque
      { wch: 32 }, // Motif
      { wch: 18 }, // Reference
      { wch: 16 }, // Phone
      { wch: 14 }, // City
      { wch: 14 }, // Date
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Virements");
    XLSX.writeFile(wb, `VIREMENTS_MARCHANDS_${dateStr}.xlsx`);

    toast.push({
      title: `تم تحميل ملف Excel الرسمي (.xlsx) (${readyWithRib.length} تاجر) - كامل بدون اختصار`,
      variant: "success",
    });
  }

  function exportBankCsv(format: "CIH" | "ATTIJARI" | "BCP" | "EXCEL_CSV") {
    if (readyWithRib.length === 0) {
      toast.push({ title: "لا يوجد تجار بحسابات بنكية (RIB) مكتملة للتصدير", variant: "error" });
      return;
    }

    const dateStr = new Date().toISOString().split("T")[0];
    let content = "";
    let filename = "";

    if (format === "CIH") {
      content = "RIB;NOM_BENEFICIAIRE;MONTANT;MOTIF;DATE\n";
      readyWithRib.forEach((r) => {
        const cleanRib = r.rib.replace(/\D/g, "");
        const name = (r.accountHolder || r.merchantName).replace(/;/g, " ");
        const motif = (r.reference ? `VIR ${r.reference}` : `COD ${r.merchantName}`).slice(0, 30);
        content += `${cleanRib};${name};${r.amountDh.toFixed(2)};${motif};${dateStr}\n`;
      });
      filename = `VIREMENTS_CIH_BANK_${dateStr}.csv`;
    } else if (format === "ATTIJARI") {
      content = "RIB_BENEFICIAIRE;NOM_BENEFICIAIRE;MONTANT;MOTIF;DATE\n";
      readyWithRib.forEach((r) => {
        const cleanRib = r.rib.replace(/\D/g, "");
        const name = (r.accountHolder || r.merchantName).replace(/;/g, " ");
        const motif = (r.reference ? `VIR ${r.reference}` : `COD ${r.merchantName}`).slice(0, 30);
        content += `${cleanRib};${name};${r.amountDh.toFixed(2)};${motif};${dateStr}\n`;
      });
      filename = `VIREMENTS_ATTIJARIWAFA_${dateStr}.csv`;
    } else if (format === "BCP") {
      content = "RIB_BENEFICIAIRE;NOM_BENEFICIAIRE;MONTANT;MOTIF;DATE\n";
      readyWithRib.forEach((r) => {
        const cleanRib = r.rib.replace(/\D/g, "");
        const name = (r.accountHolder || r.merchantName).replace(/;/g, " ");
        const motif = (r.reference ? `VIR ${r.reference}` : `COD ${r.merchantName}`).slice(0, 30);
        content += `${cleanRib};${name};${r.amountDh.toFixed(2)};${motif};${dateStr}\n`;
      });
      filename = `VIREMENTS_BANQUE_POPULAIRE_${dateStr}.csv`;
    } else {
      // CSV Compatible with Excel: uses formula ="2658..." so Excel doesn't turn it into scientific notation
      content = "sep=,\nRIB_BENEFICIAIRE,NOM_BENEFICIAIRE,MONTANT_MAD,BANQUE,MOTIF_VIREMENT,DATE\n";
      readyWithRib.forEach((r) => {
        const cleanRib = r.rib.replace(/\D/g, "");
        const name = (r.accountHolder || r.merchantName).replace(/"/g, '""');
        const motif = r.reference
          ? `VIREMENT ${r.reference} ${r.merchantName.slice(0, 15)}`
          : `REGLEMENT COD ${r.merchantName.slice(0, 15)}`;
        content += `="${cleanRib}","${name}",${r.amountDh.toFixed(2)},"${r.bankName}","${motif}","${dateStr}"\n`;
      });
      filename = `VIREMENTS_EXCEL_CSV_${dateStr}.csv`;
    }

    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    toast.push({
      title: `تم تحميل ملف (${filename}) بنجاح`,
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
              توليد ملفات التحويلات البنكية الموحدة (CIH / Attijariwafa / BCP) وصرف الأرباح
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Main button: Excel .xlsx (Opens directly in Excel without scientific notation) */}
          <Button
            size="sm"
            onClick={exportExcelFile}
            disabled={readyWithRib.length === 0}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[12px] shadow-sm gap-1.5"
          >
            <FileSpreadsheet className="size-3.5" />
            <span>تصدير Excel (.xlsx) ({readyWithRib.length})</span>
          </Button>

          {/* Secondary Dropdown: Bank-specific CSV exports */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={readyWithRib.length === 0}
                className="rounded-xl font-semibold text-[12px] gap-1 text-foreground"
              >
                <Download className="size-3.5 text-primary" />
                <span>ملفات البنوك (CSV)</span>
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-[12.5px]">
              <DropdownMenuItem onClick={() => exportBankCsv("CIH")} className="gap-2 cursor-pointer font-medium">
                <Landmark className="size-4 text-blue-600" />
                <span>CIH Bank (CSV Entreprise)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportBankCsv("ATTIJARI")} className="gap-2 cursor-pointer font-medium">
                <Landmark className="size-4 text-amber-600" />
                <span>Attijariwafa bank (CSV Clic)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportBankCsv("BCP")} className="gap-2 cursor-pointer font-medium">
                <Landmark className="size-4 text-orange-600" />
                <span>Banque Populaire (CSV)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportBankCsv("EXCEL_CSV")} className="gap-2 cursor-pointer font-medium">
                <FileText className="size-4 text-emerald-600" />
                <span>CSV مخصص لـ Excel (بدون اختصار)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            <AlertTriangle className="size-3.5" /> {rows.length - readyWithRib.length} تجار لم يسجلوا الـ RIB بعد (اضغط لإدخاله)
          </span>
        )}
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-start text-[12px]">
            <thead className="sticky top-0 bg-surface-2 text-muted-foreground border-b border-border text-[11.5px]">
              <tr>
                <th className="py-2.5 px-3 text-start font-semibold">التاجر / نوع المستحق</th>
                <th className="py-2.5 px-3 text-start font-semibold">البنك</th>
                <th className="py-2.5 px-3 text-start font-semibold">رقم الـ RIB (24 رقم)</th>
                <th className="py-2.5 px-3 text-end font-semibold">المبلغ المستحق</th>
                <th className="py-2.5 px-3 text-center font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground text-[12.5px]">
                    لا توجد طلبات سحب معلقة أو مستحقات تفوق 200 درهم في الوقت الحالي
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const rowKey = r.id || r.settlementId || r.merchantId;
                  return (
                    <tr key={rowKey} className="hover:bg-surface-2 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{r.merchantName}</span>
                          {r.source === "SETTLEMENT_REQUEST" ? (
                            <Badge tone="info" className="text-[10px] px-1.5 py-0 font-medium">
                              طلب سحب {r.reference}
                            </Badge>
                          ) : (
                            <Badge tone="neutral" className="text-[10px] px-1.5 py-0 font-medium">
                            رصيد محفظة
                          </Badge>
                          )}
                        </div>
                        <span className="block text-[10.5px] font-normal text-muted-foreground">{r.city}</span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{r.bankName}</td>
                      <td className="py-2.5 px-3">
                        {r.hasRib ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              title={`الـ RIB كامل: ${r.rib}`}
                              className="font-mono text-[11.5px] font-bold text-foreground bg-muted/80 px-2 py-0.5 rounded tracking-wide border border-border/60 select-all"
                            >
                              {r.rib.replace(/(\d{4})/g, "$1 ").trim()}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyRib(r.rib)}
                              title="نسخ رقم الـ RIB كاملاً (24 رقماً)"
                              className="inline-flex size-6 items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {copiedRib === r.rib.replace(/\D/g, "") ? (
                                <Check className="size-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="size-3.5" />
                              )}
                            </button>
                            <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditRib(r)}
                            className="inline-flex items-center gap-1 text-amber-600 hover:underline font-semibold text-[11px]"
                          >
                            <Badge tone="warning" className="text-[11px] px-1.5 py-0 cursor-pointer">
                              بانتظار الـ RIB ⚠️
                            </Badge>
                          </button>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-end font-bold text-primary tnum">
                        {money(r.amountCentimes)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] px-2 gap-1 text-primary hover:bg-primary/10"
                            onClick={() => openEditRib(r)}
                          >
                            <Edit2 className="size-3" />
                            <span>{r.hasRib ? "تعديل" : "إدخال RIB"}</span>
                          </Button>

                          {r.settlementId && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] px-2 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-500/30 font-semibold"
                              onClick={() => {
                                setPayingSettlement(r);
                                setPaymentReference("");
                                setPaymentNote("");
                              }}
                            >
                              <CheckCircle2 className="size-3" />
                              <span>تأكيد الدفع</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog for Admin to enter/edit merchant's RIB */}
      <Dialog open={Boolean(editingMerchant)} onOpenChange={(open) => !open && setEditingMerchant(null)}>
        <DialogContent size="sm">
          <DialogTitle>
            تأكيد الحساب البنكي للتاجر: {editingMerchant?.merchantName}
          </DialogTitle>
          <DialogDescription>
            أدخل رقم الـ RIB المكون من 24 رقماً للتاجر لتوليد ملف التحويل البنكي وتسهيل الصرف.
          </DialogDescription>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-muted-foreground">البنك المعتمد</label>
              <Select
                value={bankName}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBankName(e.target.value)}
                className="h-9 text-[12.5px]"
              >
                {MOROCCAN_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <label className="font-medium text-muted-foreground">رقم الـ RIB المغربي (24 رقماً)</label>
                <span
                  className={`font-mono text-[11px] font-bold ${
                    rib.replace(/\D/g, "").length === 24 ? "text-success" : "text-amber-600"
                  }`}
                >
                  {rib.replace(/\D/g, "").length} / 24 رقماً
                </span>
              </div>
              <Input
                value={rib}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, "").slice(0, 24);
                  setRib(clean);
                }}
                placeholder="Ex: 230780000123456789012345"
                maxLength={24}
                className="font-mono text-[13px] tracking-wider h-9"
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
                اسم صاحب الحساب (Titulaire du compte)
              </label>
              <Input
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="Nom complet ou raison sociale"
                className="h-9 text-[12.5px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingMerchant(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={saving || rib.replace(/\D/g, "").length !== 24 || !accountHolder.trim()}
              onClick={handleSaveRib}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Admin to confirm payment */}
      <Dialog open={Boolean(payingSettlement)} onOpenChange={(open) => !open && setPayingSettlement(null)}>
        <DialogContent size="sm">
          <DialogTitle>
            تأكيد صرف وتحويل مستحقات: {payingSettlement?.merchantName}
          </DialogTitle>
          <DialogDescription>
            المبلغ المستحق: <strong className="text-primary font-mono">{payingSettlement ? money(payingSettlement.amountCentimes) : ""}</strong> | الحساب: {payingSettlement?.bankName} ({payingSettlement?.rib})
          </DialogDescription>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
                رقم الحوالة أو المرجع البنكي (Référence du virement)
              </label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Ex: VIR-CIH-2026-94812"
                className="h-9 text-[12.5px] font-mono"
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
                ملاحظة إضافية (Optionnel)
              </label>
              <Input
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Ex: تم التحويل بنجاح"
                className="h-9 text-[12.5px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayingSettlement(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={paying}
              onClick={handleMarkPaid}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {paying ? "جاري الاعتماد..." : "تأكيد التحويل (Marquer payé)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
