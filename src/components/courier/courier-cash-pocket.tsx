"use client";

import * as React from "react";
import { Banknote, Fuel, Plus, Receipt, Sparkles, TrendingDown, Wallet } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { BottomSheetSimple } from "@/components/courier/bottom-sheet";
import { useToast } from "@/components/ui/toast";
import { PhotoInput } from "@/components/courier/photo-input";

export type PocketSummary = {
  collectedToday: number;
  expensesToday: number;
  remainingToday: number;
  cashInHand: number;
};

export function CourierCashPocket({
  summary,
  enabled = true,
}: {
  summary: PocketSummary;
  enabled?: boolean;
}) {
  const { t, money } = useI18n();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState("fuel");
  const [amount, setAmount] = React.useState("");
  const [photo, setPhoto] = React.useState("");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  if (!enabled) return null;

  async function submitExpense() {
    const parsedAmount = Math.round(Number(amount.replace(",", ".")) * 100);
    if (!parsedAmount || parsedAmount <= 0) return;

    setBusy(true);
    try {
      const res = await fetch("/api/v1/courier/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          type,
          note: note || undefined,
          proofPhoto: photo || undefined,
        }),
      });

      setBusy(false);
      if (res.ok) {
        toast.push({ title: t("courier.expense.success"), variant: "success" });
        setOpen(false);
        setAmount("");
        setPhoto("");
        setNote("");
        window.location.reload();
      } else {
        toast.push({ title: t("common.errorTitle"), variant: "error" });
      }
    } catch {
      setBusy(false);
      toast.push({ title: t("common.errorTitle"), variant: "error" });
    }
  }

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-surface to-surface p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <Wallet className="size-5" />
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-foreground">{t("courier.pocket.title")}</h2>
            <p className="text-[11.5px] text-muted-foreground">الكاش الفعلي في جيبك الآن بعد خصم المصاريف</p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpen(true)}
          className="rounded-xl border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold"
        >
          <Plus className="size-3.5" />
          <span>{t("courier.pocket.addExpense")}</span>
        </Button>
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-border bg-surface p-2.5">
          <p className="text-[11px] text-muted-foreground">{t("courier.pocket.collected")}</p>
          <p className="mt-0.5 text-[16px] font-bold text-foreground tnum">
            {money(summary.collectedToday, { compact: true })}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-2.5">
          <p className="text-[11px] text-muted-foreground">{t("courier.pocket.expenses")}</p>
          <p className="mt-0.5 text-[16px] font-bold text-error tnum">
            {summary.expensesToday > 0 ? `−${money(summary.expensesToday, { compact: true })}` : "0 DH"}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-2.5">
          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            {t("courier.pocket.netCash")}
          </p>
          <p className="mt-0.5 text-[17px] font-extrabold text-emerald-600 dark:text-emerald-400 tnum">
            {money(summary.remainingToday, { compact: true })}
          </p>
        </div>
      </div>

      {/* Add Expense Modal */}
      <BottomSheetSimple
        title={t("courier.pocket.addExpense")}
        open={open}
        onClose={() => setOpen(false)}
      >
        <div className="space-y-3.5">
          <div>
            <Label>{t("courier.expense.type")}</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1.5 flex h-10 w-full rounded-xl border border-border bg-input px-3 text-[13px] font-medium outline-none focus:border-primary"
            >
              <option value="fuel">{t("courier.expense.fuel")}</option>
              <option value="parking">{t("courier.expense.parking")}</option>
              <option value="phone">{t("courier.expense.phone")}</option>
              <option value="repair">{t("courier.expense.repair")}</option>
              <option value="other">{t("courier.expense.other")}</option>
            </select>
          </div>

          <div>
            <Label>{t("courier.expense.amount")}</Label>
            <div className="relative mt-1.5">
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                dir="ltr"
                placeholder="50.00"
                className="h-12 text-center text-[22px] font-bold tnum pe-12"
                autoFocus
              />
              <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-faint">
                DH
              </span>
            </div>
          </div>

          <div>
            <Label>{t("courier.expense.receipt")}</Label>
            <div className="mt-1.5">
              <PhotoInput onChange={(d) => setPhoto(d ?? "")} compact />
            </div>
          </div>

          <div>
            <Label>ملاحظة (اختياري)</Label>
            <Textarea
              rows={2}
              className="mt-1.5"
              placeholder="مثال: تعبئة 50 درهم مازوط لمحطة شل..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <Button
            className="h-12 w-full rounded-xl text-[15px] font-bold"
            disabled={busy || !amount}
            onClick={submitExpense}
          >
            {t("common.confirm")}
          </Button>
        </div>
      </BottomSheetSimple>
    </div>
  );
}

