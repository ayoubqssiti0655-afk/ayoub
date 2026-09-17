"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, MessageCircle, Phone, ShieldAlert, ShieldCheck, ShieldQuestion, Ban } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { waLink } from "@/lib/format";
import { confirmOrdersAction, cancelOrderAction } from "@/server/actions";
import { avatarHue } from "@/lib/format";
import { Avatar } from "@/components/ui/misc";

export type ConfirmRow = {
  id: string; reference: string; fullName: string; phone: string; city: string;
  total: number; createdAt: string;
  trust: { score: number; band: string; delivered: number; failed: number; returned: number };
};

const WA_CONFIRM = (ref: string, name: string, amount: string) =>
  `Bonjour ${name}, votre commande ${ref} chez nous est enregistrée (${amount}, paiement à la livraison). Répondez OUI pour confirmer 🙏`;

export function ConfirmQueue({ rows, enabled }: { rows: ConfirmRow[]; enabled: boolean }) {
  const { t, money, rel, phone: fmtPhone } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<Set<string>>(new Set());

  async function confirm(id: string) {
    setBusy(id);
    const res = await confirmOrdersAction([id]);
    setBusy(null);
    if (res.ok) {
      setDone((p) => new Set(p).add(id));
      toast.push({ title: t("settings.saved"), variant: "success" });
      router.refresh();
    } else toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
  }
  async function cancel(id: string) {
    setBusy(id);
    const res = await cancelOrderAction(id);
    setBusy(null);
    if (res.ok) { router.refresh(); }
    else toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
  }

  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const risky = r.trust.band === "risky" || r.trust.band === "watch";
        const Icon = r.trust.band === "new" ? ShieldQuestion : risky ? ShieldAlert : ShieldCheck;
        return (
          <li key={r.id} className={cn("rounded-xl border bg-surface p-4 shadow-xs", done.has(r.id) && "opacity-40")}>
            <div className="flex flex-wrap items-center gap-3">
              <Avatar name={r.fullName} size={38} hue={avatarHue(r.fullName)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14px] font-semibold">{r.fullName}</p>
                  <span className="text-[11.5px] text-faint tnum">{r.reference}</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold",
                      r.trust.band === "risky" ? "bg-error-soft text-error" : r.trust.band === "watch" ? "bg-warning-soft text-warning" : r.trust.band === "reliable" ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="size-3" /> {t(`trust.${r.trust.band}`)} {r.trust.score}
                  </span>
                </div>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground tnum" dir="ltr">
                  {fmtPhone(r.phone)} · {r.city} · {t("confirm.awaiting")} {rel(r.createdAt)}
                </p>
              </div>
              <span className="text-[16px] font-bold tnum">{money(r.total)}</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <a href={`tel:${r.phone}`} className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border text-[12.5px] font-medium hover:bg-muted">
                <Phone className="size-3.5" /> {t("common.call")}
              </a>
              <a
                href={waLink(r.phone, WA_CONFIRM(r.reference, r.fullName.split(" ")[0], money(r.total)))}
                target="_blank" rel="noreferrer"
                className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-success/40 bg-success-soft text-[12.5px] font-medium text-success hover:opacity-90"
              >
                <MessageCircle className="size-3.5" /> {t("confirm.wa")}
              </a>
              <Button size="sm" disabled={busy === r.id || done.has(r.id)} onClick={() => confirm(r.id)}>
                <Check className="size-3.5" /> {t("confirm.confirm")}
              </Button>
              <Button size="sm" variant="ghost" className="text-error" disabled={busy === r.id || done.has(r.id)} onClick={() => cancel(r.id)}>
                <Ban className="size-3.5" /> {t("confirm.cancel")}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
