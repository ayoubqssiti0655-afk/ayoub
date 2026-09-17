"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { markReturnReceivedAction } from "@/server/actions";

export function ReturnActionButton({
  returnId,
  status,
}: {
  returnId: string;
  status: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  if (status === "RECEIVED" || status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
        <CheckCircle2 className="size-3" /> تم الاستلام
      </span>
    );
  }

  async function handleReceived() {
    setBusy(true);
    const res = await markReturnReceivedAction(returnId);
    setBusy(false);
    if (res.ok) {
      toast.push({ title: t("returns.receivedSuccess"), variant: "success" });
      router.refresh();
    } else {
      toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={handleReceived}
      className="border-primary/20 text-[11px] text-primary hover:bg-primary-soft"
    >
      <CheckCircle2 className="size-3" />
      {busy ? t("common.loading") : t("returns.markReceived")}
    </Button>
  );
}

