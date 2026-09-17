"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Select, Field } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  setMerchantStatusAction, updateMerchantConfigAction, createSettlementForMerchantAction, resetMerchantCycleChoiceAction,
} from "@/server/admin-actions";
import { Power, Banknote, Settings2, RotateCcw } from "lucide-react";

export function MerchantAdminActions({ id, status, settlementCycle, cycleChosen = false, plan, wallet }: {
  id: string; status: string; settlementCycle: string; cycleChosen?: boolean; plan: string; wallet: number;
}) {
  const { t, money } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [configOpen, setConfigOpen] = React.useState(false);
  const [settleOpen, setSettleOpen] = React.useState(false);
  const [cycle, setCycle] = React.useState(settlementCycle);
  const [planSel, setPlanSel] = React.useState(plan);
  const [busy, setBusy] = React.useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => setConfigOpen(true)}>
        <Settings2 className="size-3.5" /> {t("common.edit")}
      </Button>
      <Button size="sm" variant="outline" disabled={wallet < 20000} onClick={() => setSettleOpen(true)}>
        <Banknote className="size-3.5" /> {t("admin.settlements.new")}
      </Button>
      <Button
        size="sm"
        variant={status === "SUSPENDED" ? "default" : "outline"}
        className={status === "SUSPENDED" ? "" : "text-error"}
        onClick={async () => {
          const next = status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
          const res = await setMerchantStatusAction(id, next);
          toast.push({ title: res.ok ? t("settings.saved") : res.message ?? t("common.errorTitle"), variant: res.ok ? "success" : "error" });
          if (res.ok) router.refresh();
        }}
      >
        <Power className="size-3.5" /> {status === "SUSPENDED" ? t("admin.merchants.activate") : t("admin.merchants.suspend")}
      </Button>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent size="sm">
          <DialogTitle>{t("common.edit")}</DialogTitle>
          <DialogDescription />
          <div className="mt-3 grid gap-3">
            <Field label={t("settings.settlementCycle")}>
              <Select value={cycle} onChange={(e) => setCycle(e.target.value)}>
                {["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"].map((c) => <option key={c} value={c}>{t(`cycle.${c}`)}</option>)}
              </Select>
            </Field>
            {cycleChosen && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-[12px]">
                <span className="text-muted-foreground">{t("wallet.cycle.lockedBadge")}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11.5px]"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const res = await resetMerchantCycleChoiceAction(id);
                    setBusy(false);
                    if (res.ok) {
                      toast.push({ title: t("admin.merchants.resetCycleSuccess"), variant: "success" });
                      router.refresh();
                    }
                  }}
                >
                  <RotateCcw className="size-3" /> {t("admin.merchants.resetCycleChoice")}
                </Button>
              </div>
            )}
            <Field label={t("common.plan")}>
              <Select value={planSel} onChange={(e) => setPlanSel(e.target.value)}>
                {["starter", "growth", "scale"].map((p) => <option key={p} value={p}>{t(`plan.${p}`)}</option>)}
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfigOpen(false)}>{t("common.cancel")}</Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const res = await updateMerchantConfigAction(id, { settlementCycle: cycle, plan: planSel });
                setBusy(false);
                if (res.ok) { setConfigOpen(false); toast.push({ title: t("settings.saved"), variant: "success" }); router.refresh(); }
              }}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent size="sm">
          <DialogTitle>{t("admin.settlements.new")}</DialogTitle>
          <DialogDescription>{t("admin.settlements.createDesc")}</DialogDescription>
          <p className="mt-3 rounded-lg bg-primary-soft px-3 py-2 text-[13px] font-semibold text-primary tnum">{money(wallet)}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSettleOpen(false)}>{t("common.cancel")}</Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const res = await createSettlementForMerchantAction(id);
                setBusy(false);
                if (res.ok) { setSettleOpen(false); toast.push({ title: `${t("wallet.requested")} — ${res.data?.reference}`, variant: "success" }); router.refresh(); }
                else toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
              }}
            >
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
