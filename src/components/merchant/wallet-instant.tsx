"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { useToast } from "@/components/ui/toast";
import { sendDigestAction } from "@/server/actions";

/** Daily digest send button for the merchant dashboard. */
export function DigestCard() {
  const { t } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await sendDigestAction();
        setBusy(false);
        toast.push({ title: res.ok ? t("digest.sent") : res.message ?? t("common.errorTitle"), variant: res.ok ? "success" : "error" });
      }}
      className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[13px] font-medium shadow-xs transition-colors hover:bg-muted disabled:opacity-50"
    >
      <Send className="size-4 text-primary" />
      {t("digest.send")}
    </button>
  );
}
