"use client";

import * as React from "react";
import { ScanLine, CameraOff } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

/**
 * QR parcel-label scanner. Uses the native BarcodeDetector when available
 * (Chromium/Android), falls back to manual reference entry everywhere else.
 */
export function QrScanButton({ className }: { className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [manual, setManual] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const supported = typeof window !== "undefined" && "BarcodeDetector" in window;

  async function go(ref: string) {
    const clean = ref.trim().toUpperCase();
    const match = clean.match(/MSR-[A-Z0-9]{6}/);
    if (!match) { setError(t("courier.scan.notFound")); return; }
    try {
      const res = await fetch(`/api/v1/courier/lookup/${encodeURIComponent(match[0])}`);
      if (!res.ok) { setError(t("courier.scan.notFound")); return; }
      const j = await res.json();
      stop();
      setOpen(false);
      router.push(`/courier/deliveries/${j.data.deliveryId}`);
    } catch {
      setError(t("courier.scan.notFound"));
    }
  }

  function stop() {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }

  React.useEffect(() => {
    if (!open || !supported) return;
    let cancelled = false;
    let raf = 0;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach((tr) => tr.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length && codes[0].rawValue) {
              await go(codes[0].rawValue);
              return;
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
  }, [open, supported]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <button
        onClick={() => { setError(null); setOpen(true); }}
        className={className ?? "flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-muted-foreground"}
      >
        <ScanLine className="size-4" /> {t("courier.scan")}
      </button>

      {open && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => { stop(); setOpen(false); }} />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-2xl border-t border-border bg-surface p-4 pb-8 shadow-lg animate-slide-up">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong" />
            <h2 className="mb-3 text-[15px] font-semibold">{t("courier.scan.title")}</h2>
            {supported && !error?.includes("Camera") ? (
              <>
                <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-border bg-black/80">
                  <video ref={videoRef} className="h-56 w-full object-cover" muted playsInline />
                  <span className="pointer-events-none absolute inset-x-10 top-1/2 h-40 -translate-y-1/2 rounded-xl border-2 border-primary/70" />
                </div>
                <p className="mt-2 text-center text-[12px] text-muted-foreground">{t("courier.scan.hint")}</p>
              </>
            ) : (
              <p className="flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-[12.5px] text-warning">
                <CameraOff className="size-4" /> {error ?? t("courier.scan.cameraError")}
              </p>
            )}
            <div className="mt-3">
              <p className="mb-1.5 text-[12px] text-muted-foreground">{t("courier.scan.fallback")}</p>
              <div className="flex gap-2">
                <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="MSR-8X2K4Q" dir="ltr" className="tnum uppercase" />
                <Button onClick={() => go(manual)}>{t("common.confirm")}</Button>
              </div>
              {error && !error.includes("Camera") && <p className="mt-1.5 text-[12px] font-medium text-error">{error}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
