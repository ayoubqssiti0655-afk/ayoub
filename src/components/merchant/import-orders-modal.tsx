"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, X, ArrowRight, Sheet, RefreshCw } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { bulkImportOrdersAction, fetchGoogleSheetRowsAction, type BulkImportRowInput } from "@/server/actions";

type ParsedItem = BulkImportRowInput & {
  isValid: boolean;
  error?: string;
};

export function ImportOrdersModal({
  open,
  onOpenChange,
  cities,
  googleSheetsEnabled = true,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cities: string[];
  googleSheetsEnabled?: boolean;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [mode, setMode] = React.useState<"file" | "sheets">("file");
  const [sheetUrl, setSheetUrl] = React.useState("");
  const [fetchingSheet, setFetchingSheet] = React.useState(false);
  const [items, setItems] = React.useState<ParsedItem[]>([]);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  async function handleFetchGoogleSheet() {
    if (!sheetUrl.trim()) return;
    setFetchingSheet(true);
    const res = await fetchGoogleSheetRowsAction(sheetUrl.trim());
    setFetchingSheet(false);
    if (res.ok && res.data) {
      const parsed: ParsedItem[] = res.data.rows.map((r) => {
        let isValid = true;
        let error: string | undefined;
        if (!r.fullName.trim()) { isValid = false; error = "Nom manquant"; }
        else if (!/^0[67]\d{8}$/.test(r.phone)) { isValid = false; error = "Téléphone marocain invalide (06/07)"; }
        return {
          ...r,
          isValid,
          error,
        };
      });
      setItems(parsed);
      setFileName(`Google Sheets (${parsed.length} lignes)`);
      toast.push({ title: `${parsed.length} commandes chargées depuis Google Sheets`, variant: "success" });
    } else {
      toast.push({ title: res.message ?? "Erreur de chargement Google Sheets", variant: "error" });
    }
  }

  function downloadTemplate() {
    const data = [
      {
        "الاسم الكامل / Nom": "محمد الإدريسي",
        "الهاتف / Telephone": "0612345678",
        "المدينة / Ville": "Casablanca",
        "العنوان / Adresse": "شارع الزرقطوني عمارة 12 شقة 4",
        "المنتج / Produit": "ساعة ذكية / Smartwatch",
        "مبلغ الدفع عند الاستلام / COD": 350,
        "ملاحظات / Notes": "يرجى الاتصال قبل الوصول",
      },
      {
        "الاسم الكامل / Nom": "فاطمة الزهراء العلمي",
        "الهاتف / Telephone": "0698765432",
        "المدينة / Ville": "Rabat",
        "العنوان / Adresse": "حي أكدال، شارع فال ولد عمير 88",
        "المنتج / Produit": "حقيبة جلدية",
        "مبلغ الدفع عند الاستلام / COD": 420,
        "ملاحظات / Notes": "التسليم بعد الساعة الثانية زوالا",
      },
      {
        "الاسم الكامل / Nom": "أمين بناني",
        "الهاتف / Telephone": "0701020304",
        "المدينة / Ville": "Marrakech",
        "العنوان / Adresse": "جيليز، شارع محمد الخامس",
        "المنتج / Produit": "حذاء رياضي",
        "مبلغ الدفع عند الاستلام / COD": 280,
        "ملاحظات / Notes": "",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modèle Commandes");
    XLSX.writeFile(wb, "masar-orders-template.xlsx");
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        if (!rawData || rawData.length === 0) {
          toast.push({ title: t("orders.importEmpty"), variant: "error" });
          return;
        }

        const parsed: ParsedItem[] = rawData.map((row) => {
          // Flexible key mapping
          const getVal = (patterns: string[]) => {
            for (const p of patterns) {
              for (const k of Object.keys(row)) {
                if (k.toLowerCase().includes(p.toLowerCase())) {
                  return row[k];
                }
              }
            }
            return undefined;
          };

          const fullName = String(getVal(["الاسم", "nom", "name", "customer", "client"]) ?? "").trim();
          let phone = String(getVal(["هاتف", "tel", "phone", "mobile"]) ?? "").trim();
          const city = String(getVal(["مدينة", "ville", "city"]) ?? "").trim();
          const address = String(getVal(["عنوان", "adresse", "address", "rue"]) ?? "").trim();
          const productName = String(getVal(["منتج", "produit", "product", "article", "item"]) ?? "Colis").trim();
          const codRaw = getVal(["cod", "ثمن", "مبلغ", "prix", "montant", "amount", "total"]);
          const notes = String(getVal(["ملاحظ", "note", "remarque"]) ?? "").trim();

          const codAmount = Number(codRaw) || 0;

          // Validation
          const cleanPhone = phone.replace(/[\s\-]/g, "");
          const phoneRegex = /^(\+212|0)[5-7]\d{8}$/;
          let isValid = true;
          let error = "";

          if (!fullName) {
            isValid = false;
            error = "الاسم مطلوب";
          } else if (!phoneRegex.test(cleanPhone)) {
            isValid = false;
            error = "رقم هاتف غير صالح (مثال: 0612345678)";
          } else if (!city) {
            isValid = false;
            error = "المدينة مطلوبة";
          }

          return {
            fullName,
            phone: cleanPhone,
            city,
            address: address || city,
            productName,
            codAmount,
            notes,
            isValid,
            error,
          };
        });

        setItems(parsed);
      } catch (err) {
        console.error("Parse error:", err);
        toast.push({ title: "فشل في قراءة ملف الإكسل", variant: "error" });
      }
    };
    reader.readAsBinaryString(file);
  }

  async function confirmImport() {
    const validRows = items.filter((x) => x.isValid);
    if (validRows.length === 0) return;

    setBusy(true);
    const res = await bulkImportOrdersAction(validRows);
    setBusy(false);

    if (res.ok) {
      toast.push({
        title: t("orders.importSuccess", { count: res.data?.count ?? validRows.length }),
        variant: "success",
      });
      onOpenChange(false);
      setItems([]);
      setFileName(null);
    } else {
      toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
    }
  }

  const validCount = items.filter((x) => x.isValid).length;
  const invalidCount = items.length - validCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2">
          <FileSpreadsheet className="size-5 text-primary" />
          {t("orders.importTitle")}
        </DialogTitle>
        <DialogDescription>
          {t("orders.importDesc")}
        </DialogDescription>

        <div className="mt-4 space-y-4">
          {/* Source Selector: Fichier Excel vs Google Sheets */}
          {googleSheetsEnabled && (
            <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1 text-[12.5px]">
              <button
                type="button"
                onClick={() => setMode("file")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-1.5 font-medium transition-all ${
                  mode === "file"
                    ? "bg-surface text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileSpreadsheet className="size-3.5 text-emerald-600" />
                <span>Fichier Excel / CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("sheets")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-1.5 font-medium transition-all ${
                  mode === "sheets"
                    ? "bg-surface text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sheet className="size-3.5 text-emerald-600" />
                <span>Google Sheets (مزامنة مباشرة)</span>
              </button>
            </div>
          )}

          {/* Google Sheets Form */}
          {mode === "sheets" && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
                  <Sheet className="size-5" />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-foreground">
                    المزامنة الفورية مع جداول Google Sheets
                  </h4>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5">
                    ألصق رابط Google Sheets لسحب الطلبات تلقائياً ومطابقة الأعمدة وأرقام الهواتف.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                  dir="ltr"
                />
                <Button
                  type="button"
                  disabled={fetchingSheet || !sheetUrl.trim()}
                  onClick={handleFetchGoogleSheet}
                  className="font-semibold shadow-sm shrink-0"
                >
                  <RefreshCw className={`size-3.5 ${fetchingSheet ? "animate-spin" : ""}`} />
                  <span>{fetchingSheet ? "Chargement..." : "Charger"}</span>
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground italic">
                * ملاحظة: تأكد من تفعيل إمكانية الوصول في Google Sheets: Partager → Tous les utilisateurs disposant du lien (Anyone with the link).
              </p>
            </div>
          )}

          {/* Download template banner */}
          {mode === "file" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary-soft p-3.5">
                <div>
                  <p className="text-[13px] font-semibold text-primary">هل تحتاج إلى نموذج جاهز؟</p>
                  <p className="text-[12px] text-muted-foreground">حمل نموذج إكسل بالمطابقة المغربية لتعبئة طلباتك بسهولة</p>
                </div>
                <Button size="sm" variant="outline" onClick={downloadTemplate}>
                  <Download className="size-3.5" />
                  {t("orders.downloadTemplate")}
                </Button>
              </div>

              {/* Upload input */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-2 px-6 py-7 text-center transition-colors hover:border-primary/50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleFile}
                />
                <div className="flex size-11 items-center justify-center rounded-xl bg-surface shadow-xs">
                  <Upload className="size-5 text-primary" />
                </div>
                <p className="mt-3 text-[13.5px] font-medium">
                  {fileName ? fileName : t("orders.dropExcel")}
                </p>
                <p className="mt-1 text-[11.5px] text-muted-foreground">يدعم ملفات Excel (.xlsx, .xls) و CSV</p>
              </div>
            </>
          )}

          {/* Parsed list preview */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold">
                  {t("orders.parsedRows")} ({items.length})
                </p>
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="flex items-center gap-1 font-medium text-success">
                    <CheckCircle2 className="size-3.5" /> {validCount} {t("orders.validRows")}
                  </span>
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1 font-medium text-error">
                      <AlertCircle className="size-3.5" /> {invalidCount} {t("orders.invalidRows")}
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-xl border border-border bg-surface">
                <table className="w-full text-[12.5px]">
                  <thead className="sticky top-0 border-b border-border bg-muted/60 text-start text-faint">
                    <tr>
                      <th className="px-3 py-2 text-start">الزبون</th>
                      <th className="px-3 py-2 text-start">الهاتف</th>
                      <th className="px-3 py-2 text-start">المدينة</th>
                      <th className="px-3 py-2 text-start">المبلغ (COD)</th>
                      <th className="px-3 py-2 text-start">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((it, idx) => (
                      <tr key={idx} className={it.isValid ? "hover:bg-muted/30" : "bg-error-soft/30"}>
                        <td className="px-3 py-2 font-medium">{it.fullName || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground" dir="ltr">{it.phone || "—"}</td>
                        <td className="px-3 py-2">{it.city || "—"}</td>
                        <td className="px-3 py-2 font-semibold tnum">{it.codAmount} DH</td>
                        <td className="px-3 py-2">
                          {it.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                              <CheckCircle2 className="size-3" /> صالحة
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-error" title={it.error}>
                              <AlertCircle className="size-3" /> {it.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            onClick={confirmImport}
            disabled={busy || validCount === 0}
          >
            {busy ? t("common.loading") : t("orders.confirmImport", { count: validCount })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

