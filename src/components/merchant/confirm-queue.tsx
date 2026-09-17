"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check, MessageCircle, Phone, ShieldAlert, ShieldCheck, ShieldQuestion,
  Ban, Volume2, VolumeX, Radio, Search, CheckCircle2, RefreshCw,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { waLink } from "@/lib/format";
import { confirmOrdersAction, cancelOrderAction } from "@/server/actions";
import { avatarHue } from "@/lib/format";
import { Avatar } from "@/components/ui/misc";

export type ConfirmRow = {
  id: string;
  reference: string;
  fullName: string;
  phone: string;
  city: string;
  total: number;
  createdAt: string;
  trust: { score: number; band: string; delivered: number; failed: number; returned: number };
};

const WA_CONFIRM = (ref: string, name: string, amount: string) =>
  `السلام عليكم ${name}، معكم المتجر بخصوص طلبيتكم رقم ${ref} بمبلغ ${amount} (الدفع عند الاستلام). نرجو منكم تأكيد العنوان للشحن 🙏`;

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18); // A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

export function ConfirmQueue({ rows, enabled }: { rows: ConfirmRow[]; enabled: boolean }) {
  const { t, money, rel, phone: fmtPhone } = useI18n();
  const router = useRouter();
  const toast = useToast();

  const [list, setList] = React.useState<ConfirmRow[]>(rows);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [lastSync, setLastSync] = React.useState<Date>(new Date());
  const [isLiveActive, setIsLiveActive] = React.useState(true);

  // Initialize sound preference
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("masar_confirm_sound");
      if (saved !== null) setSoundEnabled(saved === "true");
    } catch {}
  }, []);

  function toggleSound() {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("masar_confirm_sound", String(next));
      } catch {}
      return next;
    });
  }

  // Real-time Live Polling (every 3.5 seconds)
  React.useEffect(() => {
    if (!isLiveActive) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/v1/confirmations");
        if (!res.ok) return;
        const data = await res.json();
        if (!data.orders) return;

        setLastSync(new Date());

        setList((prev) => {
          const prevIds = new Set(prev.map((x) => x.id));
          const newOrders = (data.orders as ConfirmRow[]).filter((x) => !prevIds.has(x.id));

          if (newOrders.length > 0) {
            if (soundEnabled) {
              playNotificationChime();
            }
            toast.push({
              title: `🔔 وصل طلب جديد بانتظار التأكيد: ${newOrders[0].reference}`,
              variant: "default",
            });
          }

          return data.orders;
        });
      } catch (err) {
        console.error("Live sync failed", err);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isLiveActive, soundEnabled, toast]);

  async function handleConfirm(id: string) {
    setBusy(id);
    // Optimistic removal
    setList((prev) => prev.filter((x) => x.id !== id));
    const res = await confirmOrdersAction([id]);
    setBusy(null);

    if (res.ok) {
      toast.push({ title: "✓ تم تأكيد الطلب بنجاح ونقله للشحن", variant: "success" });
      router.refresh();
    } else {
      toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
      // Revert if error
      const refetch = await fetch("/api/v1/confirmations");
      if (refetch.ok) {
        const d = await refetch.json();
        setList(d.orders);
      }
    }
  }

  async function handleCancel(id: string) {
    setBusy(id);
    // Optimistic removal
    setList((prev) => prev.filter((x) => x.id !== id));
    const res = await cancelOrderAction(id);
    setBusy(null);

    if (res.ok) {
      toast.push({ title: "تم إلغاء الطلب بنجاح", variant: "default" });
      router.refresh();
    } else {
      toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
    }
  }

  const filtered = list.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.fullName.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      r.reference.toLowerCase().includes(q) ||
      r.city.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Live Stream Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-xs">
        <div className="flex items-center gap-3">
          {/* Glowing live indicator */}
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
              LIVE مباشر
            </span>
          </div>

          <p className="text-[12.5px] font-semibold">
            {list.length} {list.length === 1 ? "طلب بانتظار التأكيد" : "طلبات بانتظار التأكيد"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sound toggle button */}
          <button
            type="button"
            onClick={toggleSound}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium transition-colors",
              soundEnabled
                ? "border-primary/30 bg-primary-soft text-primary"
                : "border-border bg-surface text-muted-foreground hover:bg-muted"
            )}
            title={soundEnabled ? "إيقاف التنبيه الصوتي" : "تفعيل التنبيه الصوتي"}
          >
            {soundEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
            <span className="hidden sm:inline">
              {soundEnabled ? "الصوت مفعّل" : "صامت"}
            </span>
          </button>

          {/* Search */}
          <div className="relative w-44 sm:w-56">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الهاتف..."
              className="h-8 ps-8 text-[12px]"
            />
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-success-soft text-success">
            <CheckCircle2 className="size-6" />
          </div>
          <h3 className="mt-3 text-[15px] font-semibold">لا توجد طلبات جديدة بانتظار التأكيد</h3>
          <p className="mt-1 max-w-sm text-[12.5px] text-muted-foreground">
            المنصة متصلة بشكل مباشر (LIVE) وسيتم إشعارك فور وصول أي طلب جديد من المتاجر أو الزبائن.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => {
            const risky = r.trust.band === "risky" || r.trust.band === "watch";
            const Icon = r.trust.band === "new" ? ShieldQuestion : risky ? ShieldAlert : ShieldCheck;

            return (
              <li
                key={r.id}
                className="rounded-2xl border border-border bg-surface p-4 shadow-xs transition-all hover:border-primary/40"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar name={r.fullName} size={40} hue={avatarHue(r.fullName)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14.5px] font-semibold">{r.fullName}</p>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono font-medium text-faint tnum">
                        {r.reference}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                          r.trust.band === "risky"
                            ? "bg-error-soft text-error"
                            : r.trust.band === "watch"
                            ? "bg-warning-soft text-warning"
                            : r.trust.band === "reliable"
                            ? "bg-success-soft text-success"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="size-3" /> {t(`trust.${r.trust.band}`)} ({r.trust.score}/100)
                      </span>
                    </div>
                    <p className="mt-1 text-[12.5px] text-muted-foreground tnum" dir="ltr">
                      {fmtPhone(r.phone)} · {r.city} · {t("confirm.awaiting")} {rel(r.createdAt)}
                    </p>
                  </div>
                  <div className="text-end">
                    <span className="text-[18px] font-bold text-foreground tnum">{money(r.total)}</span>
                    <span className="block text-[11px] text-faint">الدفع عند الاستلام</span>
                  </div>
                </div>

                <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <a
                    href={`tel:${r.phone}`}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface text-[12.5px] font-semibold transition-colors hover:bg-muted"
                  >
                    <Phone className="size-3.5" /> {t("common.call")}
                  </a>
                  <a
                    href={waLink(r.phone, WA_CONFIRM(r.reference, r.fullName.split(" ")[0], money(r.total)))}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-success/30 bg-success-soft text-[12.5px] font-semibold text-success transition-colors hover:bg-success-soft/80"
                  >
                    <MessageCircle className="size-3.5" /> {t("confirm.wa")}
                  </a>
                  <Button
                    size="sm"
                    disabled={busy === r.id}
                    onClick={() => handleConfirm(r.id)}
                    className="rounded-xl font-semibold"
                  >
                    <Check className="size-3.5" /> {t("confirm.confirm")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-xl text-error hover:bg-error-soft"
                    disabled={busy === r.id}
                    onClick={() => handleCancel(r.id)}
                  >
                    <Ban className="size-3.5" /> {t("confirm.cancel")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
