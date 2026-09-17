"use client";

import * as React from "react";
import { Brain, CheckCircle2, TriangleAlert, XCircle } from "lucide-react";
import { useI18n } from "@/i18n/provider";

type Check = {
  enabled: boolean;
  score: number;
  level: "good" | "improve" | "bad";
  issues: { code: string; messageFr: string; messageAr: string }[];
  suggestions: string[];
};

/** Address IQ panel — checks address quality as the merchant types. */
export function AddressIQ({ address, city }: { address: string; city?: string }) {
  const { locale, t } = useI18n();
  const [check, setCheck] = React.useState<Check | null>(null);
  const [timer, setTimer] = React.useState<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (timer) clearTimeout(timer);
    if (address.trim().length < 8) { setCheck(null); return; }
    setTimer(setTimeout(async () => {
      try {
        const res = await fetch("/api/v1/orders/address-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, city }),
        });
        const j = await res.json();
        setCheck(j.data.enabled ? j.data : null);
      } catch {}
    }, 600));
    return () => { if (timer) clearTimeout(timer); };
  }, [address, city]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!check) return null;
  const Icon = check.level === "good" ? CheckCircle2 : check.level === "improve" ? TriangleAlert : XCircle;
  const color = check.level === "good" ? "text-success" : check.level === "improve" ? "text-warning" : "text-error";
  const border = check.level === "good" ? "border-success/30 bg-success-soft" : check.level === "improve" ? "border-warning/30 bg-warning-soft" : "border-error/30 bg-error-soft";

  return (
    <div className={`sm:col-span-2 rounded-xl border p-3 ${border}`}>
      <p className={`flex items-center gap-2 text-[12.5px] font-semibold ${color}`}>
        <Brain className="size-4" /> {t(`addressIQ.${check.level}`)}
        <span className="ms-auto tnum">{check.score}/100</span>
      </p>
      {check.issues.slice(0, 3).map((iss) => (
        <p key={iss.code} className="mt-1 text-[11.5px] leading-4 text-muted-foreground">
          • {locale === "ar" ? iss.messageAr : iss.messageFr}
        </p>
      ))}
      {check.suggestions.length > 0 && check.level !== "good" && (
        <p className="mt-1.5 text-[11.5px] text-faint">{check.suggestions.join(" · ")}</p>
      )}
    </div>
  );
}
