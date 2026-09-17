"use client";

import * as React from "react";
import { Banknote, ShieldCheck, Wallet } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { BottomSheetSimple } from "@/components/courier/bottom-sheet";
import { useToast } from "@/components/ui/toast";
import { PhotoInput } from "@/components/courier/photo-input";

export type CashSummary = {
  collectedToday: number;
  declaredToday: number;
  remainingToday: number;
  cashInHand: number;
};

export function CashDeclaration({ summary }: { summary: CashSummary }) {
  const { t, money } = useI18n();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [photo, setPhoto] = React.useState("");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const suggested = Math.max(0, summary.remainingToday);

  async function submit() {
    setBusy(true);
    const res = await fetch("/api/v1/courier/deposits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Math.round(Number(amount.replace(",", ".")) * 100) || 0, proofPhoto: photo || undefined, note: note || undefined }),
    });
    setBusy(false);
    if (res.ok) {
      toast.push({ title: t("courier.cash.done"), variant: "success" });
      setOpen(false);
      setAmount(""); setPhoto(""); setNote("");
      window.location.reload();
    } else {
      toast.push({ title: t("common.errorTitle"), variant: "error" });
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold">
          <Wallet className="size-4 text-primary" /> {t("courier.cash.title")}
        </h2>
        <Button size="sm" disabled={summary.collectedToday === 0 && summary.cashInHand === 0} onClick={() => { setAmount(suggested ? String(suggested / 100) : ""); setOpen(true); }}>
          {t("courier.cash.declare")}
        </Button>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-surface-2 p-2.5">
          <dt className="text-[10.5px] text-muted-foreground">{t("courier.cash.collected")}</dt>
          <dd className="mt-0.5 text-[15px] font-semibold tnum">{money(summary.collectedToday, { compact: true })}</dd>
        </div>
        <div className="rounded-lg bg-surface-2 p-2.5">
          <dt className="text-[10.5px] text-muted-foreground">{t("courier.cash.declared")}</dt>
          <dd className="mt-0.5 text-[15px] font-semibold tnum">{money(summary.declaredToday, { compact: true })}</dd>
        </div>
        <div className="rounded-lg bg-primary-soft p-2.5">
          <dt className="text-[10.5px] text-primary">{t("courier.cash.remaining")}</dt>
          <dd className="mt-0.5 text-[15px] font-semibold text-primary tnum">{money(summary.remainingToday, { compact: true })}</dd>
        </div>
      </dl>
      {summary.cashInHand > 0 && (
        <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <Banknote className="size-3.5" /> {t("courier.cash.inHand")} : <strong className="text-foreground tnum">{money(summary.cashInHand)}</strong>
        </p>
      )}

      <BottomSheetSimple title={t("courier.cash.declare")} onClose={() => setOpen(false)} open={open}>
        <div className="space-y-3">
          <div>
            <Label>{t("courier.cash.amount")}</Label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              dir="ltr"
              className="mt-1.5 h-11 text-center text-[20px] font-semibold tnum"
              placeholder="0.00"
              autoFocus
            />
            {suggested > 0 && (
              <button type="button" onClick={() => setAmount(String(suggested / 100))} className="mt-1.5 text-[12px] font-medium text-primary hover:underline">
                {t("courier.cash.expected")} : {money(suggested)}
              </button>
            )}
          </div>
          <div>
            <Label>{t("courier.cash.proof")}</Label>
            <div className="mt-1.5">
              <PhotoInput onChange={(d) => setPhoto(d ?? "")} compact />
            </div>
          </div>
          <div>
            <Label>{t("courier.cash.note")}</Label>
            <Textarea rows={2} className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {Number(amount.replace(",", ".")) * 100 !== suggested && amount !== "" && (
            <p className="flex items-center gap-1.5 rounded-lg bg-warning-soft px-2.5 py-1.5 text-[12px] text-warning">
              <ShieldCheck className="size-3.5" /> {t("courier.cash.off")}
            </p>
          )}
          <Button className="h-12 w-full text-[15px]" disabled={busy || !amount} onClick={submit}>
            {t("common.confirm")}
          </Button>
        </div>
      </BottomSheetSimple>
    </div>
  );
}
