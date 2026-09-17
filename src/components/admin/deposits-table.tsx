"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { setDepositStatusAction } from "@/server/admin-actions";

export type DepositRow = {
  id: string; amount: number; expectedAmount: number; difference: number;
  status: string; declaredAt: string; note: string | null; hasPhoto: boolean;
};

export function DepositsTable({ deposits }: { deposits: DepositRow[] }) {
  const { t, money, dateTime } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);

  if (!deposits.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface shadow-xs">
      <h2 className="border-b border-border px-4 py-3 text-[13.5px] font-semibold">{t("courier.cash.title")}</h2>
      <ul className="divide-y divide-border/70">
        {deposits.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-2.5 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold tnum">
                {money(d.amount)}
                <span className="ms-2 text-[11.5px] font-normal text-muted-foreground">
                  {t("courier.cash.expected")} : {money(d.expectedAmount)}
                </span>
              </p>
              <p className="text-[11.5px] text-faint">
                {dateTime(d.declaredAt)}{d.note ? ` · ${d.note}` : ""}{d.hasPhoto ? " · 📷" : ""}
              </p>
            </div>
            <Badge tone={d.status === "VERIFIED" ? "success" : d.status === "MISMATCH" ? "error" : "warning"} dot>
              {t(`cash.status.${d.status}`)}
            </Badge>
            {d.status === "DECLARED" && (
              <div className="flex gap-1.5">
                <Button
                  size="sm" variant="outline"
                  disabled={busy === d.id}
                  onClick={async () => {
                    setBusy(d.id);
                    await setDepositStatusAction(d.id, "VERIFIED");
                    setBusy(null);
                    toast.push({ title: t("settings.saved"), variant: "success" });
                    router.refresh();
                  }}
                >
                  <CheckCircle2 className="size-3.5 text-success" />
                </Button>
                <Button
                  size="sm" variant="outline"
                  disabled={busy === d.id}
                  onClick={async () => {
                    setBusy(d.id);
                    await setDepositStatusAction(d.id, "MISMATCH");
                    setBusy(null);
                    toast.push({ title: t("cash.status.MISMATCH"), variant: "error" });
                    router.refresh();
                  }}
                >
                  <TriangleAlert className="size-3.5 text-error" />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
