"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Eraser, MapPin, MessageCircle, Phone, Camera, PenLine, Hash, TriangleAlert, CalendarClock, ChevronLeft, PackageCheck } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Select, Textarea, Label } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/components/ui/toast";
import { PhotoInput } from "@/components/courier/photo-input";
import { CourierNavAction, CourierWhatsAppActions } from "@/components/courier/courier-quick-actions";
import { cn } from "@/lib/utils";
import { mapsLink, waLink } from "@/lib/format";

export type CourierDeliveryDetail = {
  id: string; reference: string; status: string; otpRequired: boolean;
  customerName: string; customerPhone: string; address: string; city: string;
  codAmount: number; attempts: number; note?: string | null;
  merchantName: string; gpsLat: number | null; gpsLng: number | null;
  exchangeFor?: string | null;
  slotDate?: string | null; slotWindow?: string | null;
  allowOpenParcel?: boolean;
};

const FAIL_REASONS = ["NO_ANSWER", "WRONG_ADDRESS", "POSTPONED", "REFUSED", "OUT_OF_ZONE", "UNREACHABLE"];

export function CourierDeliveryClient({ d, exchangeEnabled = true, allowOpenParcelEnabled = true }: { d: CourierDeliveryDetail; exchangeEnabled?: boolean; allowOpenParcelEnabled?: boolean }) {
  const { t, money, phone: fmtPhone } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [sheet, setSheet] = React.useState<null | "deliver" | "fail" | "reschedule">(null);
  const [busy, setBusy] = React.useState(false);
  const [otp, setOtp] = React.useState("");
  const [reason, setReason] = React.useState("NO_ANSWER");
  const [note, setNote] = React.useState("");
  const [nextDate, setNextDate] = React.useState("");
  const [mode, setMode] = React.useState<"otp" | "signature" | "photo">("otp");
  const [otpError, setOtpError] = React.useState(false);
  const [exchangePicked, setExchangePicked] = React.useState(false);

  async function advance(to: "PICKED_UP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY") {
    setBusy(true);
    const res = await fetch(`/api/v1/courier/deliveries/${d.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to }),
    });
    setBusy(false);
    if (res.ok) { toast.push({ title: t("settings.saved"), variant: "success" }); router.refresh(); }
    else toast.push({ title: t("common.errorTitle"), variant: "error" });
  }

  async function attempt(payload: Record<string, unknown>, successMsg: string) {
    setBusy(true);
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      payload.gpsLat = pos.coords.latitude;
      payload.gpsLng = pos.coords.longitude;
      await post(payload, successMsg);
    }, async () => {
      await post(payload, successMsg);
    }, { timeout: 4000 });
  }

  async function post(payload: Record<string, unknown>, successMsg: string) {
    const res = await fetch(`/api/v1/courier/deliveries/${d.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (res.ok) {
      toast.push({ title: successMsg, variant: "success" });
      setSheet(null);
      router.push("/courier");
      router.refresh();
    } else {
      const j = await res.json().catch(() => null);
      toast.push({ title: j?.error?.message ?? t("common.errorTitle"), variant: "error" });
      if (payload.otp) setOtpError(true);
    }
  }

  const statusFlow: Record<string, { label: string; to: "PICKED_UP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" } | null> = {
    ASSIGNED: { label: t("courier.markPickedUp"), to: "PICKED_UP" },
    PICKED_UP: { label: t("courier.startTransit"), to: "IN_TRANSIT" },
    IN_TRANSIT: { label: t("courier.arrived"), to: "OUT_FOR_DELIVERY" },
    OUT_FOR_DELIVERY: null,
  };
  const next = statusFlow[d.status] ?? null;

  return (
    <div className="space-y-4">
      <button onClick={() => router.push("/courier")} className="inline-flex items-center gap-1 text-[12.5px] text-muted-foreground">
        <ChevronLeft className="size-3.5 rtl:rotate-180" /> {t("courier.deliveriesTitle")}
      </button>

      {/* customer card */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11.5px] text-muted-foreground">{t("courier.parcelFor", { name: d.customerName })}</p>
            <h1 className="mt-0.5 text-[18px] font-semibold tracking-[-0.02em]">{d.customerName}</h1>
            <p className="mt-0.5 text-[12.5px] text-faint tnum">{d.reference} · {d.merchantName}</p>
          </div>
          <StatusBadge status={d.status} />
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-[13.5px] leading-5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
          {d.address}, {d.city}
        </p>
        {d.note && <p className="mt-2 rounded-lg bg-warning-soft px-2.5 py-1.5 text-[12.5px] text-warning">{d.note}</p>}
        {allowOpenParcelEnabled && (
          <div className={`mt-2 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-semibold ${
            d.allowOpenParcel
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border border-border bg-surface-2 text-muted-foreground"
          }`}>
            <PackageCheck className="size-4 shrink-0" />
            <span>
              {d.allowOpenParcel
                ? "✓ OUVERTURE DU COLIS AUTORISÉE (معاينة الطرد مسموحة)"
                : "✗ NE PAS OUVRIR AVANT PAIEMENT (ممنوع الفتح قبل الأداء)"}
            </span>
          </div>
        )}
        {d.slotDate && d.slotWindow && (
          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-primary-soft px-2.5 py-1.5 text-[12.5px] font-semibold text-primary tnum">
            {t("courier.slot")} : {d.slotDate} · {d.slotWindow}
          </p>
        )}

        {d.codAmount > 0 ? (
          <div className="mt-3 rounded-xl border border-success/25 bg-success-soft px-3.5 py-2.5">
            <p className="text-[11.5px] font-medium text-success">{t("courier.collectCOD", { amount: money(d.codAmount) })}</p>
            <p className="text-[22px] font-semibold text-success tnum">{money(d.codAmount)}</p>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-border bg-muted px-3.5 py-2.5">
            <p className="text-[12.5px] font-medium text-muted-foreground">{t("payment.PREPAID")}</p>
          </div>
        )}

        <div className="mt-3.5 grid grid-cols-3 gap-2">
          <a href={`tel:${d.customerPhone}`} className="flex h-11 flex-col items-center justify-center gap-0.5 rounded-xl bg-primary text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            <Phone className="size-4" /> {t("common.call")}
          </a>
          <CourierWhatsAppActions
            customerName={d.customerName}
            customerPhone={d.customerPhone}
            reference={d.reference}
            codAmount={d.codAmount}
            size="default"
            className="h-11 flex-col text-[11px] rounded-xl"
          />
          <CourierNavAction
            address={d.address}
            city={d.city}
            lat={d.gpsLat}
            lng={d.gpsLng}
            size="default"
            className="h-11 flex-col text-[11px] rounded-xl"
          />
        </div>
      </div>

      <p className="text-center text-[11.5px] text-faint tnum">
        {t("courier.attemptNumber", { n: d.attempts + 1, max: 3 })}
      </p>

      {d.exchangeFor && exchangeEnabled && (
        <label
          className={
            "flex items-center gap-2.5 rounded-xl border px-3.5 py-3 " +
            (exchangePicked ? "border-success/40 bg-success-soft" : "border-violet/40 bg-violet-soft")
          }
        >
          <input
            type="checkbox"
            checked={exchangePicked}
            onChange={(e) => setExchangePicked(e.target.checked)}
            className="size-5 accent-[var(--primary)]"
          />
          <span className={"text-[13px] font-medium " + (exchangePicked ? "text-success" : "text-violet")}>
            {t("exchange.pickupAction", { ref: d.exchangeFor })}
          </span>
        </label>
      )}

      {/* primary flow */}
      {next ? (
        <Button size="lg" className="h-13 w-full py-4 text-[15px]" disabled={busy} onClick={() => advance(next.to)}>
          {next.label}
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <Button size="lg" className="h-14 flex-col gap-0.5 py-2 text-[14px]" disabled={busy} onClick={() => setSheet("deliver")}>
            <Check className="size-5" /> {t("courier.stepDeliver")}
          </Button>
          <Button size="lg" variant="outline" className="h-14 flex-col gap-0.5 border-error/40 py-2 text-[14px] text-error hover:bg-error-soft" disabled={busy} onClick={() => setSheet("fail")}>
            <TriangleAlert className="size-5" /> {t("courier.stepIssue")}
          </Button>
        </div>
      )}

      {/* reschedule shortcut */}
      {d.status === "OUT_FOR_DELIVERY" && (
        <Button variant="ghost" size="sm" className="w-full" onClick={() => setSheet("reschedule")}>
          <CalendarClock className="size-3.5" /> {t("courier.reschedule")}
        </Button>
      )}

      {/* ── deliver sheet (POD) ── */}
      {sheet === "deliver" && (
        <BottomSheet title={t("courier.pod")} onClose={() => setSheet(null)}>
          <div className="mb-3 flex rounded-lg border border-border p-0.5">
            {(["otp", "signature", "photo"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11.5px] font-medium",
                  mode === m ? "bg-primary-soft text-primary" : "text-muted-foreground"
                )}
              >
                {m === "otp" && <Hash className="size-3.5" />}
                {m === "signature" && <PenLine className="size-3.5" />}
                {m === "photo" && <Camera className="size-3.5" />}
                {t(`courier.${m === "otp" ? "otpLabel" : m}`)}
              </button>
            ))}
          </div>

          {mode === "otp" && (
            <>
              <p className="mb-2.5 text-[12.5px] leading-5 text-muted-foreground">{t("courier.otpHint")}</p>
              <input
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(false); }}
                inputMode="numeric"
                autoFocus
                dir="ltr"
                className={cn(
                  "w-full rounded-xl border-2 bg-input py-3 text-center text-[24px] font-semibold tracking-[0.35em] tnum outline-none",
                  otpError ? "border-error" : "border-border focus:border-primary"
                )}
                placeholder="••••••"
                maxLength={6}
              />
              {otpError && <p className="mt-1.5 text-[12px] font-medium text-error">{t("courier.otpWrong")}</p>}
              <Button
                className="mt-3.5 h-12 w-full text-[15px]"
                disabled={busy || otp.length !== 6}
                onClick={() => attempt({ result: "DELIVERED", otp, proofType: "OTP", exchangePickedUp: d.exchangeFor ? exchangePicked : undefined }, t("courier.deliveredToast"))}
              >
                {t("courier.otpVerify")}
              </Button>
            </>
          )}

          {mode === "signature" && (
            <>
              <p className="mb-2.5 text-[12.5px] text-muted-foreground">{t("courier.signatureHint")}</p>
              <SignaturePad onChange={(data) => setNote(data ?? "")} />
              <Button
                className="mt-3.5 h-12 w-full text-[15px]"
                disabled={busy}
                onClick={() => attempt({ result: "DELIVERED", proofType: "SIGNATURE", signature: note, exchangePickedUp: d.exchangeFor ? exchangePicked : undefined }, t("courier.deliveredToast"))}
              >
                {t("courier.confirmDelivery")}
              </Button>
            </>
          )}

          {mode === "photo" && (
            <>
              <p className="mb-2.5 text-[12.5px] text-muted-foreground">{t("courier.photoHint")}</p>
              <PhotoInput onChange={(data) => setNote(data ?? "")} />
              <Button
                className="mt-3.5 h-12 w-full text-[15px]"
                disabled={busy || !note}
                onClick={() => attempt({ result: "DELIVERED", proofType: "PHOTO", photo: note, exchangePickedUp: d.exchangeFor ? exchangePicked : undefined }, t("courier.deliveredToast"))}
              >
                {t("courier.confirmDelivery")}
              </Button>
            </>
          )}
        </BottomSheet>
      )}

      {/* ── fail sheet ── */}
      {sheet === "fail" && (
        <BottomSheet title={t("courier.confirmFailure")} onClose={() => setSheet(null)}>
          <div className="space-y-3">
            <div>
              <Label>{t("courier.reasonLabel")}</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {FAIL_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    className={cn(
                      "rounded-lg border px-2.5 py-2.5 text-start text-[12px] font-medium leading-4 transition-colors",
                      reason === r ? "border-error/40 bg-error-soft text-error" : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {t(`fail.${r}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>{t("courier.noteLabel")}</Label>
                <span className="text-[11px] text-faint">نقرة سريعة</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {[
                  t("courier.notes.doorbellBroken"),
                  t("courier.notes.concierge"),
                  t("courier.notes.callHusband"),
                  t("courier.notes.traveling"),
                  t("courier.notes.wrongNumber"),
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setNote((prev) => (prev ? `${prev} - ${chip}` : chip))}
                    className="rounded-lg border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft/40 hover:text-primary"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
              <Textarea rows={2} className="mt-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("courier.notePlaceholder")} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11" disabled={busy} onClick={() => attempt({ result: "POSTPONED", reason, note }, t("courier.rescheduleToast"))}>
              <CalendarClock className="size-4" /> {t("courier.reschedule")}
            </Button>
            <Button variant="destructive" className="h-11" disabled={busy} onClick={() => attempt({ result: "FAILED", reason, note }, t("courier.failedToast"))}>
              {t("courier.confirmFailure")}
            </Button>
          </div>
        </BottomSheet>
      )}

      {/* ── reschedule sheet ── */}
      {sheet === "reschedule" && (
        <BottomSheet title={t("courier.reschedule")} onClose={() => setSheet(null)}>
          <Label>{t("courier.selectDate")}</Label>
          <input
            type="date"
            value={nextDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setNextDate(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-lg border border-border bg-input px-3 text-[13px]"
          />
          <Button
            className="mt-4 h-11 w-full"
            disabled={busy || !nextDate}
            onClick={() =>
              attempt(
                { result: "POSTPONED", reason: "POSTPONED", note, nextActionAt: new Date(`${nextDate}T09:00:00`).toISOString() },
                t("courier.rescheduleToast")
              )
            }
          >
            {t("common.confirm")}
          </Button>
        </BottomSheet>
      )}
    </div>
  );
}

// ── Bottom sheet ──────────────────────────────────────────────────
function BottomSheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-2xl border-t border-border bg-surface p-4 pb-6 shadow-lg animate-slide-up" style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-[12.5px] text-muted-foreground hover:bg-muted">{t("common.close")}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Signature pad ─────────────────────────────────────────────────
function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const drawing = React.useRef(false);
  const empty = React.useRef(true);

  React.useEffect(() => {
    const canvas = ref.current!;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = 320;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, 160);
  }, []);

  function pos(e: React.PointerEvent) {
    const rect = ref.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function start(e: React.PointerEvent) {
    drawing.current = true;
    const ctx = ref.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = ref.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    empty.current = false;
  }
  function end() {
    drawing.current = false;
    if (!empty.current) onChange(ref.current!.toDataURL("image/png"));
  }
  function clear() {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, 160);
    empty.current = true;
    onChange(null);
  }

  return (
    <div className="relative">
      <canvas
        ref={ref}
        className="h-40 w-full touch-none rounded-xl border-2 border-dashed border-border bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <button type="button" onClick={clear} className="absolute end-2 top-2 flex items-center gap-1 rounded-md bg-surface/90 px-2 py-1 text-[11px] font-medium text-muted-foreground shadow-xs">
        <Eraser className="size-3" /> Clear
      </button>
    </div>
  );
}
