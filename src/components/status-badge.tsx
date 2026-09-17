"use client";

import { Badge, type Tone } from "@/components/ui/badge";
import { statusTone } from "@/lib/constants";
import { useI18n } from "@/i18n/provider";

/** Translated domain status pill (order / delivery / return / cod / settlement…). */
export function StatusBadge({ status, dot = true, size }: { status: string; dot?: boolean; size?: "sm" }) {
  const { t } = useI18n();
  const tone = statusTone(status) as Tone;
  return (
    <Badge tone={tone} dot={dot} className={size === "sm" ? "px-1.5 py-0 text-[11px]" : undefined}>
      {t(`status.${status}`)}
    </Badge>
  );
}

/** Translated failure reason chip. */
export function FailReasonLabel({ code }: { code: string }) {
  const { t } = useI18n();
  return <>{t(`fail.${code}`, {}) !== `fail.${code}` ? t(`fail.${code}`) : code}</>;
}
