"use client";

import * as React from "react";
import { ScanLine, CameraOff, CheckCircle2, RefreshCw, Volume2, Sparkles } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

function playScanBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
    osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08); // E6

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
}

export function QrScanButton({
  className,
  continuousEnabled = true,
}: {
  className?: string;
  continuousEnabled?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isContinuous, setIsContinuous] = React.useState(false);
  const [manual, setManual] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [scannedRefs, setScannedRefs] = React.useState<string[]>([]);
  const [lastScanned, setLastScanned] = React.useState<string | null>(null);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const lastScanTimeRef = React.useRef<number>(0);

  const supported = typeof window !== "undefined" && "BarcodeDetector" in window;

  async function handleDetectedCode(raw: string) {
    const clean = raw.trim().toUpperCase();
    const match = clean.match(/MSR-[A-Z0-9]{6}/);
    if (!match) return;
    const ref = match[0];

    const now = Date.now();
    // Debounce duplicate scans within 2.5 seconds
    if (lastScanned === ref && now - lastScanTimeRef.current < 2500) {
      return;
    }
    lastScanTimeRef.current = now;

    try {
      const res = await fetch(`/api/v1/courier/lookup/${encodeURIComponent(ref)}`);
      if (!res.ok) {
        setError(`الرمز ${ref} غير موجود أو غير مسند إليك`);
        return;
      }
      const j = await res.json();
      const deliveryId = j.data?.deliveryId;

      playScanBeep();
      setLastScanned(ref);

      if (isContinuous) {
        // Automatically advance to OUT_FOR_DELIVERY
        await fetch(`/api/v1/courier/deliveries/${deliveryId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: "OUT_FOR_DELIVERY" }),
        }).catch(() => {});

        setScannedRefs((prev) => (prev.includes(ref) ? prev : [...prev, ref]));
      } else {
        stop();
        setOpen(false);
        router.push(`/courier/deliveries/${deliveryId}`);
      }
    } catch {
      setError(t("courier.scan.notFound"));
    }
  }

  function stop() {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }

  function handleClose() {
    stop();
    setOpen(false);
    if (scannedRefs.length > 0) {
      router.refresh();
    }
  }

  React.useEffect(() => {
    if (!open || !supported) return;
    let cancelled = false;
    let raf = 0;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = new (window as any).BarcodeDetector({
          formats: ["qr_code", "code_128", "code_39", "ean_13"],
        });

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length && codes[0].rawValue) {
              await handleDetectedCode(codes[0].rawValue);
            }
          } catch {}
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setError(t("courier.scan.cameraError"));
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stop();
    };
  }, [open, supported, isContinuous]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <button
        onClick={() => {
          setError(null);
          setScannedRefs([]);
          setLastScanned(null);
          setOpen(true);
        }}
        className={
          className ??
          "flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-foreground shadow-xs hover:bg-muted transition-colors"
        }
      >
        <ScanLine className="size-4 text-primary" />
        <span>{t("courier.scan")}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 animate-fade-in sm:items-center sm:justify-center p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border-t sm:border border-border bg-surface p-5 shadow-2xl animate-slide-up">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border-strong sm:hidden" />

            {/* Header with Continuous Mode Switch */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-[15.5px] font-bold">{t("courier.scan.title")}</h2>
                <p className="text-[11.5px] text-muted-foreground">وجه الكاميرا نحو باركود أو QR الطرد</p>
              </div>

              {continuousEnabled && (
                <button
                  type="button"
                  onClick={() => setIsContinuous(!isContinuous)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11.5px] font-semibold transition-colors",
                    isContinuous
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "border-border bg-surface-2 text-muted-foreground hover:bg-muted"
                  )}
                >
                  <RefreshCw className={cn("size-3.5", isContinuous && "animate-spin text-emerald-500")} />
                  <span>{isContinuous ? "وضع المستودع المتواصل" : "مسح فردي"}</span>
                </button>
              )}
            </div>

            {/* Camera View */}
            {supported && !error?.includes("Camera") ? (
              <div className="mt-4">
                <div className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-black shadow-inner">
                  <video ref={videoRef} className="h-60 w-full object-cover" muted playsInline />
                  <span className="pointer-events-none absolute inset-x-8 top-1/2 h-36 -translate-y-1/2 rounded-2xl border-2 border-dashed border-emerald-400/80 animate-pulse" />

                  {/* Scanned Badge in Continuous Mode */}
                  {isContinuous && (
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between rounded-xl bg-black/60 px-3 py-1.5 text-white backdrop-blur-md">
                      <span className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-400">
                        <CheckCircle2 className="size-4" />
                        {scannedRefs.length} طرد ممسوح
                      </span>
                      {lastScanned && (
                        <span className="font-mono text-[11px] text-white/90">{lastScanned} ✓</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-warning-soft px-3 py-2.5 text-[12.5px] text-warning">
                <CameraOff className="size-4" /> {error ?? t("courier.scan.cameraError")}
              </p>
            )}

            {/* Manual fallback input */}
            <div className="mt-4">
              <div className="flex gap-2">
                <Input
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="MSR-8X2K4Q"
                  dir="ltr"
                  className="h-10 font-mono text-[13px] uppercase rounded-xl"
                />
                <Button
                  onClick={() => handleDetectedCode(manual)}
                  className="h-10 rounded-xl px-4 font-semibold"
                >
                  {t("common.confirm")}
                </Button>
              </div>
              {error && !error.includes("Camera") && (
                <p className="mt-1.5 text-[12px] font-medium text-error">{error}</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant={isContinuous && scannedRefs.length > 0 ? "default" : "outline"}
                className="w-full h-10 rounded-xl font-bold"
                onClick={handleClose}
              >
                {isContinuous && scannedRefs.length > 0
                  ? `إنهاء وبدء الجولة (${scannedRefs.length} طرد)`
                  : t("common.close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

