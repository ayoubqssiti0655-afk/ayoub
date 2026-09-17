"use client";

import * as React from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

/** Prepay a COD parcel by card — CMI simulation. */
export function TrackingPay({ reference, amountLabel }: { reference: string; amountLabel: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [card, setCard] = React.useState({ number: "", exp: "", cvc: "" });
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function pay() {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/tracking/${encodeURIComponent(reference)}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
      });
      if (res.ok) {
        setDone(true);
        toast.push({ title: t("tracking.pay.success"), variant: "success" });
        setTimeout(() => window.location.reload(), 1200);
      } else {
        toast.push({ title: t("tracking.pay.declined"), variant: "error" });
      }
    } catch {
      toast.push({ title: t("tracking.pay.declined"), variant: "error" });
    }
    setBusy(false);
  }

  if (done) {
    return (
      <p className="rounded-xl border border-success/30 bg-success-soft px-4 py-2.5 text-center text-[13px] font-semibold text-success">
        {t("tracking.paid")}
      </p>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary-soft py-2.5 text-[13px] font-semibold text-primary"
      >
        <CreditCard className="size-4" /> {t("tracking.pay.button")}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogTitle>{t("tracking.pay.title")}</DialogTitle>
          <DialogDescription>{t("tracking.pay.desc", { amount: amountLabel })}</DialogDescription>
          <div className="mt-3 space-y-3">
            <Field label={t("tracking.pay.card")}>
              <Input value={card.number} onChange={(e) => setCard((c) => ({ ...c, number: e.target.value }))} placeholder="4242 4242 4242 4242" dir="ltr" inputMode="numeric" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("tracking.pay.exp")}>
                <Input value={card.exp} onChange={(e) => setCard((c) => ({ ...c, exp: e.target.value }))} placeholder="12/28" dir="ltr" />
              </Field>
              <Field label={t("tracking.pay.cvc")}>
                <Input value={card.cvc} onChange={(e) => setCard((c) => ({ ...c, cvc: e.target.value }))} placeholder="123" dir="ltr" inputMode="numeric" />
              </Field>
            </div>
            <p className="flex items-center gap-1.5 text-[11.5px] text-faint">
              <ShieldCheck className="size-3.5" /> {t("tracking.pay.simulation")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button disabled={busy || card.number.replace(/\s/g, "").length < 12 || !/^\d{2}\/\d{2}$/.test(card.exp) || card.cvc.length < 3} onClick={pay}>
              {t("tracking.pay.cta", { amount: amountLabel })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
