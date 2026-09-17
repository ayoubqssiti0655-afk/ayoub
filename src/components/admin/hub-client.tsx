"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PackageOpen, Plus, Lock } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input, Select, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared";
import { useToast } from "@/components/ui/toast";
import { createBagAction, addParcelToBagAction, sealBagAction } from "@/server/admin-actions";

export type BagRow = {
  id: string; reference: string; city: string; status: string; sealCode: string | null;
  parcelCount: number; parcelRefs: string[]; courierName: string | null; createdAt: string;
};

export function HubClient({ bags, cities, couriers }: { bags: BagRow[]; cities: string[]; couriers: { id: string; name: string }[] }) {
  const { t, dateTime } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [city, setCity] = React.useState(cities[0] ?? "Casablanca");
  const [courierId, setCourierId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [openBagId, setOpenBagId] = React.useState<string | null>(bags.find((b) => b.status === "OPEN")?.id ?? null);
  const [scanRef, setScanRef] = React.useState("");

  const openBag = bags.find((b) => b.id === openBagId && b.status === "OPEN") ?? null;

  async function createBag() {
    setBusy(true);
    const res = await createBagAction(city, courierId || null);
    setBusy(false);
    if (res.ok && res.data) { setOpenBagId(res.data.id); router.refresh(); }
    else toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
  }

  async function addParcel() {
    if (!openBag || !scanRef.trim()) return;
    setBusy(true);
    const res = await addParcelToBagAction(openBag.id, scanRef.trim());
    setBusy(false);
    if (res.ok) { setScanRef(""); router.refresh(); }
    else toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
  }

  async function seal() {
    if (!openBag) return;
    setBusy(true);
    const res = await sealBagAction(openBag.id);
    setBusy(false);
    if (res.ok) {
      toast.push({ title: t("hub.sealed", { code: res.data?.sealCode }), variant: "success" });
      setOpenBagId(null);
      router.refresh();
    } else toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
  }

  return (
    <div className="space-y-4">
      {/* open bag composer */}
      {openBag ? (
        <div className="rounded-xl border border-primary/25 bg-primary-soft p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-primary tnum">
              <PackageOpen className="size-4" /> {openBag.reference} · {openBag.city}
            </h2>
            <Button size="sm" disabled={busy || openBag.parcelCount === 0} onClick={seal}>
              <Lock className="size-3.5" /> {t("hub.seal")}
            </Button>
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={scanRef}
              onChange={(e) => setScanRef(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && addParcel()}
              placeholder={t("hub.addParcel")}
              dir="ltr"
              className="tnum"
              autoFocus
            />
            <Button disabled={busy || !scanRef.trim()} onClick={addParcel}>{t("common.add")}</Button>
          </div>
          {openBag.parcelRefs.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {openBag.parcelRefs.map((r) => (
                <li key={r}><code className="rounded-md bg-surface px-2 py-1 text-[11.5px] tnum">{r}</code></li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11.5px] text-primary/70">{t("hub.parcels", { count: openBag.parcelCount })}</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface p-4 shadow-xs">
          <div className="min-w-40">
            <Label>{t("hub.city")}</Label>
            <Select value={city} onChange={(e) => setCity(e.target.value)} className="mt-1.5 w-44">
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div className="min-w-40">
            <Label>{t("hub.courier")}</Label>
            <Select value={courierId} onChange={(e) => setCourierId(e.target.value)} className="mt-1.5 w-52">
              <option value="">—</option>
              {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <Button disabled={busy} onClick={createBag}>
            <Plus className="size-4" /> {t("hub.newBag")}
          </Button>
        </div>
      )}

      {/* bag list */}
      <div className="rounded-xl border border-border bg-surface shadow-xs">
        {bags.length === 0 ? (
          <EmptyState icon={PackageOpen} title={t("hub.empty")} />
        ) : (
          <ul className="divide-y divide-border/70">
            {bags.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="text-[13.5px] font-semibold tnum">{b.reference}</span>
                <Badge tone={b.status === "RECEIVED" ? "success" : b.status === "SEALED" ? "info" : "neutral"} dot>
                  {t(`hub.status.${b.status}`)}
                </Badge>
                <span className="text-[12.5px] text-muted-foreground">{b.city}</span>
                <span className="text-[12px] text-faint tnum">{t("hub.parcels", { count: b.parcelCount })}</span>
                {b.sealCode && <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] tnum">🔒 {b.sealCode}</code>}
                {b.courierName && <span className="text-[12px] text-muted-foreground">→ {b.courierName}</span>}
                <span className="ms-auto text-[11px] text-faint">{dateTime(b.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
