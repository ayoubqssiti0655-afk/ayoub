"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check, MessageCircle, Phone, ShieldAlert, ShieldCheck, ShieldQuestion,
  Ban, Volume2, VolumeX, Search, CheckCircle2, Play,
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
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
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

export function ConfirmQueue({ rows = [], enabled = true }: { rows?: ConfirmRow[]; enabled?: boolean }) {
  const { t, money, rel, phone: fmtPhone } = useI18n();
  const router = useRouter();
  const toast = useToast();

  const [list, setList] = React.useState<ConfirmRow[]>(rows || []);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [isLiveActive, setIsLiveActive] = React.useState(true);

  // Sync with server props on refresh
  React.useEffect(() => {
    if (rows) setList(rows);
  }, [rows]);

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
      if (next) {
        playNotificationChime();
      }
      return next;
    });
  }

  function testSound() {
    playNotificationChime();
    toast.push({ title: "🔔 تم تشغيل نغمة الإشعار التجريبية", variant: "default" });
  }

  // Real-time Live Polling (every 3.5 seconds)
  React.useEffect(() => {
    if (!isLiveActive) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/v1/confirmations");
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data.orders)) return;

        setList((prev) => {
          const prevIds = new Set(prev.map((x) => x.id));
          const incomingOrders = (data.orders as ConfirmRow[]).filter((x) => !prevIds.has(x.id));

          if (incomingOrders.length > 0 && prev.length > 0) {
            if (soundEnabled) {
              playNotificationChime();
            }
            toast.push({
              title: `🔔 وصل طلب جديد بانتظار التأكيد: ${incomingOrders[0].reference}`,
              variant: "default",
            });
          }

          return data.orders;
        });
      } catch (err) {
        // Silent poll error
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
        if (Array.isArray(d.orders)) setList(d.orders);
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

  const safeList = Array.isArray(list) ? list : [];
  const filtered = safeList.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = (r.fullName || "").toLowerCase();
    const phone = r.phone || "";
    const ref = (r.reference || "").toLowerCase();
    const city = (r.city || "").toLowerCase();
    return name.includes(q) || phone.includes(q) || ref.includes(q) || city.includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Live Stream Control Bar */}
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
            {safeList.length} {safeList.length === 1 ? "طلب بانتظار التأكيد" : "طلبات بانتظار التأكيد"}
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

          {soundEnabled && (
            <button
              type="button"
              onClick={testSound}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="تجربة صوت الرنين"
            >
              <Play className="size-3" />
              <span className="hidden md:inline">تجربة الصوت</span>
            </button>
          )}

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

      {/* Orders List or Live Waiting Empty State */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-7" />
          </div>
          <h3 className="mt-3.5 text-[15.5px] font-semibold">لا توجد طلبات بانتظار التأكيد حالياً</h3>
          <p className="mt-1.5 max-w-md text-[13px] text-muted-foreground leading-relaxed">
            المنصة متصلة بشكل مباشر (<span className="font-semibold text-emerald-600 dark:text-emerald-400">LIVE</span>). فور وصول أي طلب جديد من متجرك الإلكتروني أو حملاتك الإعلانية سيظهر هنا فوراً مع رنين تنبيهي.
          </p>
          <div className="mt-4 flex items-center gap-2 text-[12px] text-faint">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>نظام الاستماع للطلبات يعمل ومفعّل</span>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => {
            const band = r.trust?.band ?? "neutral";
            const risky = band === "risky" || band === "watch";
            const Icon = band === "new" ? ShieldQuestion : risky ? ShieldAlert : ShieldCheck;
            const fullName = r.fullName || "زبون";
            const firstName = fullName.split(" ")[0] || "الزبون";
            const amountStr = money(r.total || 0);

            return (
              <li
                key={r.id}
                className="rounded-2xl border border-border bg-surface p-4 shadow-xs transition-all hover:border-primary/40"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar name={fullName} size={40} hue={avatarHue(fullName)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14.5px] font-semibold">{fullName}</p>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono font-medium text-faint tnum">
                        {r.reference}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                          band === "risky"
                            ? "bg-error-soft text-error"
                            : band === "watch"
                            ? "bg-warning-soft text-warning"
                            : band === "reliable"
                            ? "bg-success-soft text-success"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="size-3" /> {t(`trust.${band}`)} ({r.trust?.score ?? 50}/100)
                      </span>
                    </div>
                    <p className="mt-1 text-[12.5px] text-muted-foreground tnum" dir="ltr">
                      {fmtPhone(r.phone)} · {r.city || "—"} · {t("confirm.awaiting")} {rel(r.createdAt)}
                    </p>
                  </div>
                  <div className="text-end">
                    <span className="text-[18px] font-bold text-foreground tnum">{amountStr}</span>
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
                    href={waLink(r.phone, WA_CONFIRM(r.reference, firstName, amountStr))}
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
