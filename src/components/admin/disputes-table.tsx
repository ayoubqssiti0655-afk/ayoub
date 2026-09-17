"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Scale, XCircle } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { resolveDisputeAction } from "@/server/admin-actions";

export type DisputeRow = {
  id: string; reference: string; merchantName: string; type: string; status: string;
  description: string; openedAt: string;
};

export function DisputesTable({ disputes }: { disputes: DisputeRow[] }) {
  const { t, dateTime } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [outcome, setOutcome] = React.useState<"RESOLVED" | "REJECTED">("RESOLVED");
  const [resolution, setResolution] = React.useState("");
  const [compensation, setCompensation] = React.useState("");

  async function submit() {
    if (!openId) return;
    setBusy(openId);
    const res = await resolveDisputeAction(openId, outcome, resolution.trim(), Math.round(Number(compensation.replace(",", ".")) * 100) || 0);
    setBusy(null);
    if (res.ok) {
      toast.push({ title: t("admin.disputes.resolved"), variant: "success" });
      setOpenId(null); setResolution(""); setCompensation("");
      router.refresh();
    } else toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
  }

  if (!disputes.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface shadow-xs">
      <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 text-[13.5px] font-semibold">
        <Scale className="size-4 text-muted-foreground" /> {t("admin.disputes.title")}
      </h2>
      <ul className="divide-y divide-border/70">
        {disputes.map((d) => (
          <li key={d.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[13px] font-semibold tnum">{d.reference}</span>
              <span className="text-[12.5px] text-muted-foreground">{d.merchantName}</span>
              <Badge tone="neutral">{t(`dispute.type.${d.type}`)}</Badge>
              <Badge tone={d.status === "RESOLVED" ? "success" : d.status === "REJECTED" ? "neutral" : "warning"} dot>
                {t(`dispute.status.${d.status}`)}
              </Badge>
              <span className="ms-auto text-[11px] text-faint">{dateTime(d.openedAt)}</span>
            </div>
            <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">{d.description}</p>
            {(d.status === "OPEN" || d.status === "UNDER_REVIEW") && (
              openId === d.id ? (
                <div className="mt-2.5 grid gap-2 rounded-xl border border-border bg-surface-2 p-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>{t("admin.disputes.resolution")}</Label>
                    <Textarea rows={2} className="mt-1" value={resolution} onChange={(e) => setResolution(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t("admin.disputes.compensation")}</Label>
                    <Input className="mt-1" value={compensation} onChange={(e) => setCompensation(e.target.value)} placeholder="0.00" dir="ltr" inputMode="decimal" />
                  </div>
                  <div>
                    <Label>&nbsp;</Label>
                    <div className="mt-1 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setOutcome("RESOLVED"); submit(); }} disabled={busy === d.id || resolution.trim().length < 3}>
                        <CheckCircle2 className="size-3.5 text-success" /> {t("admin.disputes.resolve")}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-error" onClick={() => { setOutcome("REJECTED"); submit(); }} disabled={busy === d.id || resolution.trim().length < 3}>
                        <XCircle className="size-3.5" /> {t("admin.disputes.reject")}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="mt-2" onClick={() => { setOpenId(d.id); setResolution(""); setCompensation(""); }}>
                  {t("admin.disputes.resolve")}
                </Button>
              )
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
