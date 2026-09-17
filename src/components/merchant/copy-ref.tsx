"use client";

import * as React from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";

export function CopyableRef({ value, label }: { value: string; label?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }
  return (
    <button
      onClick={copy}
      title={label ?? t("common.copy")}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[11.5px] font-medium text-muted-foreground shadow-xs transition-colors hover:bg-muted"
    >
      {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
      {copied ? t("common.copied") : <Link2 className="size-3 opacity-0" aria-hidden />}
    </button>
  );
}
