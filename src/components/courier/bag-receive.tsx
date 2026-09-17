"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PackageOpen } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { BottomSheetSimple } from "@/components/courier/bottom-sheet";
import { useToast } from "@/components/ui/toast";

export type CourierBag = { id: string; reference: string; city: string; parcelCount: number };

/** Courier receives a sealed hub bag with its seal code. */
export function BagReceive({ bags }: { bags: CourierBag[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [openBag, setOpenBag] = React.useState<CourierBag | null>(null);
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  if (!bags.length) return null;

  async function receive() {
    if (!openBag) return;
    setBusy(true);
    const res = await fetch(`/api/v1/courier/bags/${openBag.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sealCode: code }),
    });
    setBusy(false);
    if (res.ok) {
      const j = await res.json();
      toast.push({ title: t("courier.bag.done", { count: j.data.parcels }), variant: "success" });
      setOpenBag(null);
      router.refresh();
    } else {
      toast.push({ title: t("common.errorTitle"), variant: "error" });
    }
  }

  return (
    <div className="rounded-xl border border-warning/30 bg-warning-soft p-4">
      <h2 className="flex items-center gap-2 text-[14px] font-semibold text-warning">
        <PackageOpen className="size-4" /> {t("courier.bag.title")}
      </h2>
      <ul className="mt-3 space-y-2">
        {bags.map((b) => (
          <li key={b.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold tnum">{b.reference}</p>
              <p className="text-[12px] text-muted-foreground">{b.city} · {t("hub.parcels", { count: b.parcelCount })}</p>
            </div>
            <Button size="sm" onClick={() => { setCode(""); setOpenBag(b); }}>
              {t("courier.bag.receive")}
            </Button>
          </li>
        ))}
      </ul>

      <BottomSheetSimple title={`${t("courier.bag.receive")} — ${openBag?.reference ?? ""}`} open={!!openBag} onClose={() => setOpenBag(null)}>
        <Label>{t("courier.bag.sealCode")}</Label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          dir="ltr"
          className="mt-1.5 h-12 text-center text-[22px] font-bold tracking-[0.4em] tnum"
          placeholder="••••"
          autoFocus
        />
        <Button className="mt-4 h-12 w-full text-[15px]" disabled={busy || code.length !== 4} onClick={receive}>
          {t("courier.bag.receive")}
        </Button>
      </BottomSheetSimple>
    </div>
  );
}
