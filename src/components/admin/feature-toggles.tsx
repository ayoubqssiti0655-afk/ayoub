"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle, ShieldCheck, Wand2, Wallet, RadioTower, ScanLine, BellRing,
  CreditCard, RefreshCcw, Sparkles, Circle, Truck, Zap, Navigation, Receipt, CheckSquare, Bike,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Switch } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { setFeatureAction } from "@/server/admin-actions";

const ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  MessageCircle, ShieldCheck, Wand2, Wallet, RadioTower, ScanLine, BellRing, CreditCard, RefreshCcw, Sparkles, Circle, Truck, Zap, Navigation, Receipt, CheckSquare, Bike,
};

export type FeatureRow = { key: string; icon: string; enabled: boolean };

export function FeatureToggles({ features }: { features: FeatureRow[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [state, setState] = React.useState(() => Object.fromEntries(features.map((f) => [f.key, f.enabled])));

  async function toggle(key: string, enabled: boolean) {
    setBusy(key);
    setState((s) => ({ ...s, [key]: enabled })); // optimistic
    const res = await setFeatureAction(key, enabled);
    setBusy(null);
    if (res.ok) {
      toast.push({ title: t("settings.saved"), variant: "success" });
      router.refresh();
    } else {
      setState((s) => ({ ...s, [key]: !enabled })); // revert
      toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
    }
  }

  return (
    <ul className="grid gap-2.5 lg:grid-cols-2">
      {features.map((f) => {
        const Icon = ICONS[f.icon] ?? Circle;
        const enabled = state[f.key];
        return (
          <li
            key={f.key}
            className={`flex items-start gap-3 rounded-xl border bg-surface p-4 shadow-xs transition-colors ${enabled ? "border-border" : "border-dashed border-border opacity-75"}`}
          >
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${enabled ? "bg-primary-soft" : "bg-muted"}`}>
              <Icon className={`size-4.5 ${enabled ? "text-primary" : "text-faint"}`} strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold">{t(`features.f.${f.key}.name`)}</p>
              <p className="mt-0.5 text-[12.5px] leading-5 text-muted-foreground">{t(`features.f.${f.key}.desc`)}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Switch
                checked={enabled}
                disabled={busy === f.key}
                onCheckedChange={(v) => toggle(f.key, v)}
                aria-label={t(`features.f.${f.key}.name`)}
              />
              <span className={`text-[10.5px] font-semibold uppercase tracking-wide ${enabled ? "text-success" : "text-faint"}`}>
                {enabled ? t("features.on") : t("features.off")}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
