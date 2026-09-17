"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, Pagination } from "@/components/shared";
import { useToast } from "@/components/ui/toast";
import { requestSettlementAction, saveMerchantBankAction, updateSettlementCycleAction } from "@/server/actions";
import { toCsv } from "@/lib/utils";
import {
  Wallet,
  Truck,
  CheckCircle2,
  Receipt,
  Search,
  Download,
  Printer,
  Landmark,
  Building2,
  Zap,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  CreditCard,
  Calendar,
  CalendarDays,
  CalendarRange,
  Lock,
} from "lucide-react";

export type TxRow = {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  occurredAt: string;
  orderId: string | null;
  reference: string | null;
};

export type SettlementRow = {
  id: string;
  reference: string;
  grossCOD: number;
  fees: number;
  netAmount: number;
  status: string;
  method: string;
  paymentReference?: string | null;
  paymentNote?: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  paidAt: string | null;
};

export type BankDetails = {
  bankName: string;
  rib: string;
  accountHolder: string;
};

export type WalletStats = {
  available: number;
  pendingCod: number;
  totalPaidOut: number;
  totalFees: number;
};

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

function formatMoroccanRib(rib: string): string {
  const clean = rib.replace(/\D/g, "");
  if (clean.length !== 24) return rib;
  // Standard format: 230 780 0001234567890123 45 (Bank 3, Branch 3, Account 16, Key 2)
  return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 22)} ${clean.slice(22, 24)}`;
}

export function WalletClient({
  balance,
  stats,
  bankDetails: initialBankDetails,
  instantPayoutEnabled = false,
  payoutFrequencyEnabled = true,
  taxInvoicesEnabled = true,
  merchantName,
  settlementCycle = "WEEKLY",
  cycleChosen = false,
  transactions,
  settlements,
  page,
  totalPages,
  total,
}: {
  balance: number;
  stats: WalletStats;
  bankDetails: BankDetails | null;
  instantPayoutEnabled?: boolean;
  payoutFrequencyEnabled?: boolean;
  taxInvoicesEnabled?: boolean;
  merchantName: string;
  settlementCycle?: string;
  cycleChosen?: boolean;
  transactions: TxRow[];
  settlements: SettlementRow[];
  page: number;
  totalPages: number;
  total: number;
}) {
  const { t, money, date } = useI18n();
  const router = useRouter();
  const toast = useToast();

  const [bank, setBank] = React.useState<BankDetails | null>(initialBankDetails);
  const [bankDialog, setBankDialog] = React.useState(false);
  const [bankForm, setBankForm] = React.useState({
    bankName: initialBankDetails?.bankName ?? "Attijariwafa bank",
    rib: initialBankDetails?.rib ?? "",
    accountHolder: initialBankDetails?.accountHolder ?? merchantName,
  });
  const [savingBank, setSavingBank] = React.useState(false);
  const [editBankInWithdraw, setEditBankInWithdraw] = React.useState(false);

  const isBankComplete = Boolean(
    bank &&
    bank.rib &&
    bank.rib.replace(/\D/g, "").length === 24 &&
    bank.accountHolder &&
    bank.bankName
  );

  // Settlement request state
  const [dialog, setDialog] = React.useState(false);
  const [withdrawMode, setWithdrawMode] = React.useState<"FULL" | "CUSTOM">("FULL");
  const [customAmountDh, setCustomAmountDh] = React.useState<string>("200");
  const [isInstant, setIsInstant] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  // Settlement frequency / cycle state
  const [cycle, setCycle] = React.useState(settlementCycle);
  const [chosen, setChosen] = React.useState(cycleChosen);
  const [savingCycle, setSavingCycle] = React.useState(false);

  React.useEffect(() => {
    setChosen(cycleChosen);
  }, [cycleChosen]);

  async function handleCycleSelect(newCycle: string) {
    if (newCycle === cycle) return; // no redundant API call
    const prev = cycle;
    setChosen(true); // Feature immediately disappears from UI
    setCycle(newCycle);
    setSavingCycle(true);
    const res = await updateSettlementCycleAction(newCycle);
    setSavingCycle(false);
    if (res.ok) {
      toast.push({ title: t("wallet.cycle.saved"), variant: "success" });
      router.refresh();
    } else {
      setChosen(cycleChosen);
      setCycle(prev);
      toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
    }
  }

  // Filter & search state
  const [type, setType] = React.useState("ALL");
  const [period, setPeriod] = React.useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Printable receipt state
  const [selectedSettlement, setSelectedSettlement] = React.useState<SettlementRow | null>(null);

  // Filtering transactions
  const filteredTransactions = React.useMemo(() => {
    return transactions.filter((tx) => {
      // Type filter
      if (type !== "ALL" && tx.type !== type) return false;

      // Period filter
      if (period !== "ALL") {
        const txDate = new Date(tx.occurredAt);
        const now = new Date();
        if (period === "TODAY") {
          if (txDate.toDateString() !== now.toDateString()) return false;
        } else if (period === "WEEK") {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (txDate < sevenDaysAgo) return false;
        } else if (period === "MONTH") {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (txDate < thirtyDaysAgo) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refMatch = tx.reference?.toLowerCase().includes(q) ?? false;
        const descMatch = tx.description?.toLowerCase().includes(q) ?? false;
        if (!refMatch && !descMatch) return false;
      }

      return true;
    });
  }, [transactions, type, period, searchQuery]);

  // Export transactions to CSV
  function handleExportCsv() {
    const csvData = filteredTransactions.map((tx) => ({
      Date: new Date(tx.occurredAt).toLocaleDateString(),
      Type: t(`codType.${tx.type}`),
      Commande: tx.reference ?? "—",
      Description: tx.description ?? "—",
      Montant: (tx.amount / 100).toFixed(2),
      Devise: "MAD",
      Statut: tx.status,
    }));
    const csv = toCsv(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-masar-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.push({ title: t("wallet.exportCsv") + " ✓", variant: "success" });
  }

  // Handle saving bank details
  async function handleSaveBank(e: React.FormEvent) {
    e.preventDefault();
    const cleanRib = bankForm.rib.replace(/\D/g, "");
    if (cleanRib.length !== 24) {
      toast.push({ title: t("wallet.bank.ribInvalid"), variant: "error" });
      return;
    }
    setSavingBank(true);
    const res = await saveMerchantBankAction({
      bankName: bankForm.bankName,
      rib: cleanRib,
      accountHolder: bankForm.accountHolder,
    });
    setSavingBank(false);
    if (res.ok) {
      setBank({
        bankName: bankForm.bankName,
        rib: cleanRib,
        accountHolder: bankForm.accountHolder,
      });
      setBankDialog(false);
      toast.push({ title: t("wallet.bank.saved"), variant: "success" });
      router.refresh();
    } else {
      toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
    }
  }

  // Handle requesting settlement
  async function handleRequestSettlement() {
    const cleanRib = bankForm.rib.replace(/\D/g, "");
    const needsBankSave = !isBankComplete || editBankInWithdraw;

    if (needsBankSave) {
      if (cleanRib.length !== 24) {
        toast.push({ title: "رقم الـ RIB المغربي يجب أن يتكون من 24 رقماً بالضبط", variant: "error" });
        return;
      }
      if (!bankForm.accountHolder.trim()) {
        toast.push({ title: "يرجى كتابة اسم صاحب الحساب البنكي للتأكيد", variant: "error" });
        return;
      }
    }

    let amountInCentimes: number | undefined = undefined;
    if (withdrawMode === "CUSTOM") {
      const parsedDh = Number(customAmountDh);
      if (isNaN(parsedDh) || parsedDh < 200) {
        toast.push({ title: t("wallet.request.amountMinError"), variant: "error" });
        return;
      }
      if (parsedDh * 100 > balance) {
        toast.push({ title: t("wallet.request.amountMaxError"), variant: "error" });
        return;
      }
      amountInCentimes = Math.round(parsedDh * 100);
    }

    setPending(true);
    const res = await requestSettlementAction({
      amount: amountInCentimes,
      isInstant,
      bankDetails: needsBankSave
        ? {
            bankName: bankForm.bankName,
            rib: cleanRib,
            accountHolder: bankForm.accountHolder.trim(),
          }
        : undefined,
    });
    setPending(false);

    if (res.ok) {
      if (needsBankSave) {
        setBank({
          bankName: bankForm.bankName,
          rib: cleanRib,
          accountHolder: bankForm.accountHolder.trim(),
        });
        setEditBankInWithdraw(false);
      }
      toast.push({ title: t("wallet.requested"), variant: "success" });
      setDialog(false);
      router.refresh();
    } else {
      toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
    }
  }

  // Progress towards 200 DH threshold
  const minThresholdCentimes = 20000;
  const progressPercent = Math.min(100, Math.max(0, Math.round((stats.available / minThresholdCentimes) * 100)));
  const canWithdraw = stats.available >= minThresholdCentimes;
  return (
    <>

      {/* ── خانة السحب الرئيسية (Main Withdrawal & Payout Hub Card) ── */}
      <div className="mb-5 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary-soft/85 via-surface to-surface p-5 shadow-xs">
        <div className={`grid grid-cols-1 gap-6 ${payoutFrequencyEnabled ? "lg:grid-cols-12 lg:items-center" : ""}`}>
          {/* Left Column: Solde & Request button */}
          <div className={`${payoutFrequencyEnabled ? "lg:col-span-5" : "w-full"} space-y-4`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-[11.5px] font-semibold text-primary">
                  <Wallet className="size-3.5" />
                  {t("wallet.kpi.available")}
                </span>
                <p className="mt-2 text-[32px] font-extrabold tracking-tight text-primary tnum leading-none">
                  {money(stats.available)}
                </p>
              </div>
              <Button
                size="default"
                disabled={!canWithdraw || pending}
                onClick={() => {
                  setWithdrawMode("FULL");
                  setCustomAmountDh((balance / 100).toFixed(0));
                  setDialog(true);
                }}
                className="shadow-sm"
              >
                {t("wallet.requestSettlement")}
              </Button>
            </div>

            {/* Threshold progress */}
            <div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-muted-foreground">
                  {canWithdraw ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-success">
                      <CheckCircle2 className="size-3.5" /> {t("wallet.kpi.readyToWithdraw")}
                    </span>
                  ) : (
                    t("wallet.kpi.threshold", { current: money(stats.available), target: money(minThresholdCentimes) })
                  )}
                </span>
                <span className="font-bold text-primary tnum">{progressPercent}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full transition-all duration-500 ${canWithdraw ? "bg-success" : "bg-primary"}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right Column: اختيار دورية وموعد السحب (Payout Frequency Selector) */}
          {payoutFrequencyEnabled && (
            <div className="lg:col-span-7 lg:border-s lg:border-border/70 lg:ps-6">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div>
                  <p className="text-[13px] font-bold text-foreground">
                    {t("wallet.cycle.label")}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {t("wallet.cycle.hint")}
                  </p>
                </div>
                {savingCycle && (
                  <span className="text-[11px] text-primary animate-pulse font-medium">Enregistrement...</span>
                )}
              </div>

              {/* 4 Selection Buttons: كل يوم | كل 7 أيام | كل 15 يوم | كل شهر */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { key: "DAILY", label: t("cycle.DAILY"), icon: Zap },
                  { key: "WEEKLY", label: t("cycle.WEEKLY"), icon: Calendar },
                  { key: "BIWEEKLY", label: t("cycle.BIWEEKLY"), icon: CalendarDays },
                  { key: "MONTHLY", label: t("cycle.MONTHLY"), icon: CalendarRange },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = cycle === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleCycleSelect(item.key)}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-center transition-all ${
                        isSelected
                          ? "border-primary bg-primary text-white shadow-sm ring-2 ring-primary/20"
                          : "border-border bg-surface hover:border-primary/40 hover:bg-surface-2 text-foreground"
                      }`}
                    >
                      <Icon className={`size-4 ${isSelected ? "text-white" : "text-primary"}`} />
                      <span className="text-[11.5px] font-semibold leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Scheduled payout note */}
              <p className="mt-2.5 text-[11.5px] font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" />
                <span>
                  {cycle === "DAILY" && t("wallet.cycle.nextDaily")}
                  {cycle === "WEEKLY" && t("wallet.cycle.nextWeekly")}
                  {cycle === "BIWEEKLY" && t("wallet.cycle.nextBiweekly")}
                  {cycle === "MONTHLY" && t("wallet.cycle.nextMonthly")}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── 3 Supporting KPI Stat Cards ─────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {/* COD en circulation */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-medium text-muted-foreground">{t("wallet.kpi.pendingCod")}</p>
              <p className="mt-1 text-[24px] font-bold tracking-tight text-foreground tnum">{money(stats.pendingCod)}</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Truck className="size-4.5" />
            </span>
          </div>
          <p className="mt-4 text-[12px] text-muted-foreground">{t("wallet.kpi.pendingDesc")}</p>
        </div>

        {/* Total déjà versé */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-medium text-muted-foreground">{t("wallet.kpi.totalPaid")}</p>
              <p className="mt-1 text-[24px] font-bold tracking-tight text-foreground tnum">{money(stats.totalPaidOut)}</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-xl bg-success-soft text-success">
              <CheckCircle2 className="size-4.5" />
            </span>
          </div>
          <p className="mt-4 text-[12px] text-muted-foreground">{t("wallet.kpi.totalPaidDesc")}</p>
        </div>

        {/* Total frais déduits */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-medium text-muted-foreground">{t("wallet.kpi.totalFees")}</p>
              <p className="mt-1 text-[24px] font-bold tracking-tight text-error tnum">− {money(stats.totalFees)}</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-xl bg-error-soft text-error">
              <Receipt className="size-4.5" />
            </span>
          </div>
          <p className="mt-4 text-[12px] text-muted-foreground">{t("wallet.kpi.totalFeesDesc")}</p>
        </div>
      </div>

      {/* ── Coordonnées Bancaires (RIB) Card ──────────────────────── */}
      <div className="mb-6 rounded-xl border border-border bg-surface p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Landmark className="size-5" />
            </span>
            <div>
              <h3 className="text-[14px] font-semibold">{t("wallet.bank.title")}</h3>
              {bank ? (
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                  <span className="font-medium text-foreground">{bank.bankName}</span>
                  <span>•</span>
                  <span className="font-mono tnum font-semibold text-foreground">{formatMoroccanRib(bank.rib)}</span>
                  <span>•</span>
                  <span>{bank.accountHolder}</span>
                </div>
              ) : (
                <p className="mt-0.5 text-[12.5px] text-amber-600 dark:text-amber-400">
                  {t("wallet.bank.notConfigured")}
                </p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setBankDialog(true)}>
            <CreditCard className="size-3.5 me-1.5" />
            {bank ? t("wallet.bank.edit") : t("wallet.bank.add")}
          </Button>
        </div>
      </div>

      {/* ── Transactions Section ──────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="text-[14px] font-semibold">{t("wallet.transactions")}</h2>
            <p className="text-[12px] text-muted-foreground">
              {filteredTransactions.length} {filteredTransactions.length === 1 ? "transaction" : "transactions"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-48 sm:w-60">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("wallet.filter.searchPlaceholder")}
                className="h-8 ps-8 text-[12.5px]"
              />
            </div>

            {/* Type selector */}
            <Select value={type} onChange={(e) => setType(e.target.value)} className="h-8 w-36 text-[12.5px]">
              <option value="ALL">{t("common.all")}</option>
              {["COD_COLLECTION", "DELIVERY_FEE", "RETURN_FEE", "ADJUSTMENT", "SETTLEMENT"].map((tp) => (
                <option key={tp} value={tp}>
                  {t(`codType.${tp}`)}
                </option>
              ))}
            </Select>

            {/* Period selector */}
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value as "ALL" | "TODAY" | "WEEK" | "MONTH")}
              className="h-8 w-36 text-[12.5px]"
            >
              <option value="ALL">{t("wallet.filter.allTime")}</option>
              <option value="TODAY">{t("wallet.filter.today")}</option>
              <option value="WEEK">{t("wallet.filter.week")}</option>
              <option value="MONTH">{t("wallet.filter.month")}</option>
            </Select>

            {/* Export CSV */}
            <Button variant="outline" size="sm" onClick={handleExportCsv} className="h-8 gap-1 text-[12px]">
              <Download className="size-3.5" />
              <span>{t("wallet.exportCsv")}</span>
            </Button>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <EmptyState icon={Wallet} title={t("wallet.empty")} />
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>{t("common.date")}</TH>
                <TH>{t("wallet.tx.type")}</TH>
                <TH className="hidden md:table-cell">{t("wallet.tx.order")}</TH>
                <TH className="hidden lg:table-cell">{t("common.description")}</TH>
                <TH className="text-end">{t("common.amount")}</TH>
                <TH>{t("common.status")}</TH>
              </TR>
            </THead>
            <TBody>
              {filteredTransactions.map((tx) => (
                <TR key={tx.id}>
                  <TD className="text-muted-foreground tnum">{date(tx.occurredAt)}</TD>
                  <TD className="font-medium">{t(`codType.${tx.type}`)}</TD>
                  <TD className="hidden md:table-cell">
                    {tx.orderId ? (
                      <a href={`/app/orders/${tx.orderId}`} className="font-semibold tnum text-primary hover:underline">
                        {tx.reference}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD className="hidden max-w-56 truncate text-muted-foreground lg:table-cell">
                    {tx.description ?? "—"}
                  </TD>
                  <TD className={`text-end font-semibold tnum ${tx.amount >= 0 ? "text-success" : "text-error"}`}>
                    {money(tx.amount, { signed: true })}
                  </TD>
                  <TD>
                    <StatusBadge status={tx.status} size="sm" type="cod" />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      {/* ── Settlements Section ───────────────────────────────────── */}
      <h2 className="mb-3 mt-8 text-[15px] font-semibold">{t("wallet.settlements")}</h2>
      <div className="rounded-xl border border-border bg-surface shadow-xs">
        {settlements.length === 0 ? (
          <EmptyState icon={Wallet} title={t("wallet.noSettlements")} />
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>{t("wallet.settlement.ref")}</TH>
                <TH className="hidden md:table-cell">{t("wallet.settlement.period")}</TH>
                <TH className="text-end">{t("wallet.settlement.gross")}</TH>
                <TH className="hidden text-end sm:table-cell">{t("wallet.settlement.fees")}</TH>
                <TH className="text-end">{t("wallet.settlement.net")}</TH>
                <TH>Mode</TH>
                <TH>{t("common.status")}</TH>
                <TH className="hidden text-end lg:table-cell">{t("wallet.settlement.date")}</TH>
                <TH className="text-end">Action</TH>
              </TR>
            </THead>
            <TBody>
              {settlements.map((s) => (
                <TR key={s.id}>
                  <TD className="font-semibold tnum">{s.reference}</TD>
                  <TD className="hidden text-muted-foreground tnum md:table-cell">
                    {s.periodStart ? `${date(s.periodStart)} → ${date(s.periodEnd ?? s.createdAt)}` : "—"}
                  </TD>
                  <TD className="text-end tnum">{money(s.grossCOD)}</TD>
                  <TD className="hidden text-end text-error tnum sm:table-cell">− {money(-s.fees)}</TD>
                  <TD className="text-end font-semibold tnum">{money(s.netAmount)}</TD>
                  <TD>
                    {s.method === "INSTANT_TRANSFER" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        <Zap className="size-3" /> Instantané
                      </span>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">Virement</span>
                    )}
                  </TD>
                  <TD>
                    <StatusBadge status={s.status} size="sm" />
                  </TD>
                  <TD className="hidden text-end text-muted-foreground tnum lg:table-cell">
                    {s.paidAt ? date(s.paidAt) : "—"}
                  </TD>
                  <TD className="text-end">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-[11.5px]"
                        onClick={() => setSelectedSettlement(s)}
                      >
                        <Printer className="size-3.5" />
                        <span>{t("wallet.receipt.print")}</span>
                      </Button>
                      {taxInvoicesEnabled && (
                        <a
                          href={`/app/invoices/${s.id}`}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-2.5 text-[11.5px] font-semibold text-primary hover:bg-primary/10 transition-colors"
                        >
                          <FileText className="size-3.5" />
                          <span>Facture TVA</span>
                        </a>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        {settlements.length > 0 && (
          <div className="border-t border-border">
            <Pagination page={page} totalPages={totalPages} total={total} per={10} basePath="/app/wallet" params={{}} />
          </div>
        )}
      </div>

      {/* ── Dialog: Coordonnées bancaires (RIB) ────────────────────── */}
      <Dialog open={bankDialog} onOpenChange={setBankDialog}>
        <DialogContent size="md">
          <DialogTitle>{t("wallet.bank.title")}</DialogTitle>
          <DialogDescription>
            Renseignez votre Relevé d&apos;Identité Bancaire pour recevoir vos virements de manière automatisée.
          </DialogDescription>

          <form onSubmit={handleSaveBank} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium">{t("wallet.bank.bankName")}</label>
              <Select
                value={bankForm.bankName}
                onChange={(e) => setBankForm((b) => ({ ...b, bankName: e.target.value }))}
                required
              >
                {MOROCCAN_BANKS.map((bnk) => (
                  <option key={bnk} value={bnk}>
                    {bnk}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                <label className="font-medium">{t("wallet.bank.rib")}</label>
                <span className="text-[11.5px] font-mono text-muted-foreground">
                  {bankForm.rib.replace(/\D/g, "").length} / 24 chiffres
                </span>
              </div>
              <Input
                value={bankForm.rib}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "").slice(0, 24);
                  setBankForm((b) => ({ ...b, rib: cleaned }));
                }}
                placeholder="Ex: 230780000123456789012345"
                maxLength={24}
                className="font-mono text-[14px] tracking-wider"
                required
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Format standard marocain composé de 24 chiffres (Banque, Ville, Compte, Clé).
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium">{t("wallet.bank.holder")}</label>
              <Input
                value={bankForm.accountHolder}
                onChange={(e) => setBankForm((b) => ({ ...b, accountHolder: e.target.value }))}
                placeholder="Nom complet ou raison sociale"
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setBankDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={savingBank}>
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Demande de versement ──────────────────────────── */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent size="sm">
          <DialogTitle>{t("wallet.requestSettlement")}</DialogTitle>
          <DialogDescription>
            {t("wallet.requestDesc", { amount: money(balance) })}
          </DialogDescription>

          <div className="mt-4 space-y-4">
            {/* Mode selection */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium">Type de retrait</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWithdrawMode("FULL")}
                  className={`rounded-lg border p-2.5 text-center text-[12.5px] font-medium transition-colors ${
                    withdrawMode === "FULL"
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {t("wallet.request.typeFull", { amount: money(balance) })}
                </button>
                <button
                  type="button"
                  onClick={() => setWithdrawMode("CUSTOM")}
                  className={`rounded-lg border p-2.5 text-center text-[12.5px] font-medium transition-colors ${
                    withdrawMode === "CUSTOM"
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {t("wallet.request.typeCustom")}
                </button>
              </div>
            </div>

            {withdrawMode === "CUSTOM" && (
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium">
                  {t("wallet.request.amountLabel")}
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min={200}
                    max={balance / 100}
                    value={customAmountDh}
                    onChange={(e) => setCustomAmountDh(e.target.value)}
                    className="pe-12 font-semibold tnum"
                  />
                  <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[12.5px] font-medium text-muted-foreground">
                    DH
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Min: 200 DH • Max: {(balance / 100).toFixed(2)} DH
                </p>
              </div>
            )}

            {/* Payout cycle info inside dialog */}
            {payoutFrequencyEnabled && (!chosen ? (
              <div className="space-y-1.5 rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-semibold text-foreground">{t("wallet.cycle.choosePrompt")}</label>
                  {savingCycle && <span className="text-[10.5px] text-primary animate-pulse">...</span>}
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {[
                    { key: "DAILY", label: t("cycle.DAILY") },
                    { key: "WEEKLY", label: t("cycle.WEEKLY") },
                    { key: "BIWEEKLY", label: t("cycle.BIWEEKLY") },
                    { key: "MONTHLY", label: t("cycle.MONTHLY") },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleCycleSelect(item.key)}
                      className={`rounded-lg border px-2 py-1.5 text-center text-[11px] font-medium transition-colors ${
                        cycle === item.key
                          ? "border-primary bg-primary text-white font-semibold shadow-xs"
                          : "border-border hover:bg-muted text-muted-foreground bg-surface"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10.5px] text-muted-foreground">
                  {cycle === "DAILY" && t("wallet.cycle.nextDaily")}
                  {cycle === "WEEKLY" && t("wallet.cycle.nextWeekly")}
                  {cycle === "BIWEEKLY" && t("wallet.cycle.nextBiweekly")}
                  {cycle === "MONTHLY" && t("wallet.cycle.nextMonthly")}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-[11.5px] text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <Lock className="size-3 text-primary" />
                  {t("wallet.cycle.lockedBadge")} <strong className="text-primary font-bold">{t("cycle." + cycle)}</strong>
                </span>
                <span>
                  {cycle === "DAILY" && t("wallet.cycle.nextDaily")}
                  {cycle === "WEEKLY" && t("wallet.cycle.nextWeekly")}
                  {cycle === "BIWEEKLY" && t("wallet.cycle.nextBiweekly")}
                  {cycle === "MONTHLY" && t("wallet.cycle.nextMonthly")}
                </span>
              </div>
            ))}

            {/* Instant Payout Toggle (if enabled in Admin) */}
            {instantPayoutEnabled && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={isInstant}
                    onChange={(e) => setIsInstant(e.target.checked)}
                    className="mt-1 size-4 rounded border-border text-primary"
                  />
                  <div>
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                      <Zap className="size-3.5 text-amber-600 fill-amber-500" />
                      {t("wallet.request.instant")}
                    </span>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {t("wallet.request.instantDesc")}
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Mandatory Bank & Personal Details Step */}
            <div className="rounded-xl border border-primary/25 bg-surface p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Landmark className="size-4 text-primary" />
                  <span className="text-[13px] font-bold text-foreground">
                    الحساب البنكي والمعلومات الشخصية (إلزامي للسحب)
                  </span>
                </div>
                {isBankComplete && !editBankInWithdraw && (
                  <button
                    type="button"
                    onClick={() => setEditBankInWithdraw(true)}
                    className="text-[11.5px] font-semibold text-primary hover:underline"
                  >
                    تعديل بيانات الـ RIB
                  </button>
                )}
              </div>

              {(!isBankComplete || editBankInWithdraw) ? (
                <div className="space-y-3 pt-1">
                  <p className="text-[11.5px] text-amber-600 dark:text-amber-400 font-medium">
                    ⚠️ يرجى تأكيد رقم الـ RIB المغربي (24 رقماً) واسم صاحب الحساب حتى يتمكن المدير من صرف مستحقاتك بنجاح.
                  </p>

                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
                      {t("wallet.bank.bankName")}
                    </label>
                    <Select
                      value={bankForm.bankName}
                      onChange={(e) => setBankForm((b) => ({ ...b, bankName: e.target.value }))}
                      className="h-9 text-[12.5px]"
                      required
                    >
                      {MOROCCAN_BANKS.map((bnk) => (
                        <option key={bnk} value={bnk}>
                          {bnk}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <label className="font-medium text-muted-foreground">
                        رقم الـ RIB المغربي (24 رقماً)
                      </label>
                      <span className={`font-mono text-[11px] font-bold ${
                        bankForm.rib.replace(/\D/g, "").length === 24 ? "text-success" : "text-amber-600"
                      }`}>
                        {bankForm.rib.replace(/\D/g, "").length} / 24 رقماً
                      </span>
                    </div>
                    <Input
                      value={bankForm.rib}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, "").slice(0, 24);
                        setBankForm((b) => ({ ...b, rib: cleaned }));
                      }}
                      placeholder="Ex: 230780000123456789012345"
                      maxLength={24}
                      className="font-mono text-[13px] tracking-wider h-9"
                      required
                    />
                    {bankForm.rib.length > 0 && bankForm.rib.length < 24 && (
                      <p className="mt-1 text-[11px] text-amber-600">
                        متبقي {24 - bankForm.rib.length} أرقام لاكتمال الـ RIB
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
                      الاسم الكامل لصاحب الحساب (يطابق بطاقة الهوية الوطنية)
                    </label>
                    <Input
                      value={bankForm.accountHolder}
                      onChange={(e) => setBankForm((b) => ({ ...b, accountHolder: e.target.value }))}
                      placeholder="Nom complet du titulaire"
                      className="h-9 text-[12.5px]"
                      required
                    />
                  </div>

                  {editBankInWithdraw && isBankComplete && (
                    <button
                      type="button"
                      onClick={() => setEditBankInWithdraw(false)}
                      className="text-[11.5px] text-muted-foreground hover:underline"
                    >
                      إلغاء التعديل والاحتفاظ بالـ RIB السابق
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-[12px]">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="size-4" />
                    <span>تم تأكيد وتوثيق الحساب البنكي</span>
                  </div>
                  <p className="mt-1 font-semibold text-foreground">
                    {bank?.bankName} • <span className="font-mono text-[12.5px] tracking-wider">{formatMoroccanRib(bank?.rib ?? "")}</span>
                  </p>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5">
                    صاحب الحساب: <strong className="text-foreground">{bank?.accountHolder}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={
                pending ||
                !canWithdraw ||
                ((!isBankComplete || editBankInWithdraw) &&
                  (bankForm.rib.replace(/\D/g, "").length !== 24 || !bankForm.accountHolder.trim()))
              }
              onClick={handleRequestSettlement}
            >
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Reçu de Versement Officiel (Printable Receipt) ── */}
      <Dialog open={Boolean(selectedSettlement)} onOpenChange={(open) => !open && setSelectedSettlement(null)}>
        <DialogContent size="lg" className="print:m-0 print:max-w-none print:border-none print:p-0 print:shadow-none">
          {selectedSettlement && (
            <div className="space-y-6">
              {/* Receipt Header */}
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-white font-black text-sm">
                      M
                    </span>
                    <span className="text-[17px] font-bold tracking-tight">Masar Delivery</span>
                  </div>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Système d&apos;exploitation et gestion de livraison au Maroc
                  </p>
                </div>
                <div className="text-end">
                  <span className="inline-block rounded-md bg-muted px-2.5 py-1 font-mono text-[12.5px] font-bold text-foreground">
                    {selectedSettlement.reference}
                  </span>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Émis le {date(selectedSettlement.createdAt)}
                  </p>
                </div>
              </div>

              {/* Title & Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[16px] font-bold uppercase tracking-wide">
                  {t("wallet.receipt.title")}
                </h3>
                <StatusBadge status={selectedSettlement.status} size="sm" />
              </div>

              {/* Merchant & Bank details grid */}
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11.5px] font-medium text-muted-foreground uppercase">{t("wallet.receipt.merchant")}</p>
                  <p className="mt-0.5 font-bold text-[14px] text-foreground">{merchantName}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Cycle: {t(`cycle.${cycle || settlementCycle}`)}</p>
                </div>
                <div>
                  <p className="text-[11.5px] font-medium text-muted-foreground uppercase">{t("wallet.receipt.beneficiary")}</p>
                  {bank ? (
                    <>
                      <p className="mt-0.5 font-bold text-[13.5px] text-foreground">{bank.bankName}</p>
                      <p className="font-mono text-[12px] text-muted-foreground tnum">{formatMoroccanRib(bank.rib)}</p>
                      <p className="text-[11.5px] text-muted-foreground">{bank.accountHolder}</p>
                    </>
                  ) : (
                    <p className="mt-0.5 text-[12px] text-muted-foreground italic">Virement bancaire</p>
                  )}
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="overflow-hidden rounded-xl border border-border">
                <Table>
                  <THead>
                    <TR className="hover:bg-transparent bg-muted/40">
                      <TH>{t("common.description")}</TH>
                      <TH className="text-end">{t("common.amount")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    <TR>
                      <TD className="font-medium">{t("wallet.receipt.grossCod")}</TD>
                      <TD className="text-end font-semibold tnum text-success">{money(selectedSettlement.grossCOD)}</TD>
                    </TR>
                    <TR>
                      <TD className="font-medium">{t("wallet.receipt.deliveryFees")}</TD>
                      <TD className="text-end font-semibold tnum text-error">− {money(-selectedSettlement.fees)}</TD>
                    </TR>
                    <TR className="bg-muted/20 font-bold border-t-2 border-border">
                      <TD className="text-[14.5px] text-foreground">{t("wallet.receipt.netTransfer")}</TD>
                      <TD className="text-end text-[16px] font-bold text-primary tnum">{money(selectedSettlement.netAmount)}</TD>
                    </TR>
                  </TBody>
                </Table>
              </div>

              {/* Payment reference info */}
              {selectedSettlement.paymentReference && (
                <div className="rounded-xl border border-border bg-surface p-3 text-[12px]">
                  <span className="font-semibold text-foreground">Réf. transaction bancaire:</span>{" "}
                  <span className="font-mono font-medium">{selectedSettlement.paymentReference}</span>
                  {selectedSettlement.paidAt && (
                    <span className="text-muted-foreground ms-2">
                      (exécuté le {date(selectedSettlement.paidAt)})
                    </span>
                  )}
                </div>
              )}

              {/* Signatures & Stamp area */}
              <div className="mt-6 grid grid-cols-2 gap-6 pt-4 text-center">
                <div className="rounded-xl border border-dashed border-border p-4">
                  <p className="text-[12px] font-semibold text-muted-foreground uppercase">{t("wallet.receipt.signatureMerchant")}</p>
                  <div className="h-16" />
                </div>
                <div className="rounded-xl border border-dashed border-border p-4">
                  <p className="text-[12px] font-semibold text-muted-foreground uppercase">{t("wallet.receipt.signaturePlatform")}</p>
                  <div className="h-16" />
                </div>
              </div>

              {/* Print action buttons */}
              <DialogFooter className="print:hidden gap-2">
                <Button variant="ghost" onClick={() => setSelectedSettlement(null)}>
                  {t("wallet.receipt.close")}
                </Button>
                {taxInvoicesEnabled && (
                  <a
                    href={`/app/invoices/${selectedSettlement.id}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 text-[12.5px] font-semibold text-primary hover:bg-primary/10 transition-colors"
                  >
                    <FileText className="size-4" />
                    <span>Facture TVA (14%)</span>
                  </a>
                )}
                <Button onClick={() => window.print()} className="gap-1.5">
                  <Printer className="size-4" />
                  {t("wallet.receipt.print")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
