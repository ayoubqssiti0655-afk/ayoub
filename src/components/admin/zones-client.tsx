"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MapPinned, Plus, Search, Star } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { updateZoneAction, createCityAction } from "@/server/admin-actions";

export type ZoneRowView = {
  id: string; cityFr: string; cityAr: string; cityEn: string; region: string;
  zoneName: string; deliveryFee: number; returnFee: number; etaHours: number; isRemote: boolean; isActive: boolean;
};

export function ZonesClient({ zones, regions, remoteMultiplier }: { zones: ZoneRowView[]; regions: { id: string; nameFr: string }[]; remoteMultiplier: number }) {
  const { t, money } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = React.useState("");
  const [edits, setEdits] = React.useState<Record<string, { fee: string; eta: string }>>({});
  const [createOpen, setCreateOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({
    nameFr: "", nameAr: "", nameEn: "", regionId: regions[0]?.id ?? "", deliveryFee: "3500", etaHours: "48", isRemote: false,
  });

  const filtered = zones.filter((z) => !q || z.cityFr.toLowerCase().includes(q.toLowerCase()) || z.region.toLowerCase().includes(q.toLowerCase()));

  function editValue(z: ZoneRowView, key: "fee" | "eta") {
    const e = edits[z.id];
    if (e) return e[key];
    return key === "fee" ? (z.deliveryFee / 100).toFixed(2) : String(z.etaHours);
  }
  function setEdit(z: ZoneRowView, key: "fee" | "eta", value: string) {
    setEdits((prev) => ({ ...prev, [z.id]: { fee: key === "fee" ? value : editValue(z, "fee"), eta: key === "eta" ? value : editValue(z, "eta") } }));
  }
  async function saveZone(z: ZoneRowView) {
    const e = edits[z.id];
    if (!e) return;
    const res = await updateZoneAction(z.id, {
      deliveryFee: Math.round(Number(e.fee.replace(",", ".")) * 100),
      etaHours: Number(e.eta) || z.etaHours,
    });
    toast.push({ title: res.ok ? t("admin.zones.updated") : t("common.errorTitle"), variant: res.ok ? "success" : "error" });
    if (res.ok) { setEdits((prev) => { const n = { ...prev }; delete n[z.id]; return n; }); router.refresh(); }
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.searchCity")} className="ps-8" />
        </div>
        <Button size="sm" className="ms-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" /> {t("admin.zones.newCity")}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-xs">
        {filtered.length === 0 ? (
          <EmptyState icon={MapPinned} title={t("common.noResults")} />
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>{t("common.city")}</TH>
                <TH className="hidden md:table-cell">{t("common.region")}</TH>
                <TH>{t("admin.zones.table.fee")}</TH>
                <TH className="hidden text-end sm:table-cell">{t("admin.zones.table.returnFee")}</TH>
                <TH>{t("admin.zones.table.eta")}</TH>
                <TH className="w-20" />
              </TR>
            </THead>
            <TBody>
              {filtered.map((z) => {
                const dirty = !!edits[z.id];
                return (
                  <TR key={z.id}>
                    <TD>
                      <p className="font-medium">{z.cityFr}</p>
                      <p className="text-[11px] text-faint">{z.cityAr}</p>
                    </TD>
                    <TD className="hidden text-muted-foreground md:table-cell">
                      {z.region}
                      {z.isRemote && <Badge tone="warning" className="ms-2"><Star className="size-2.5" />{t("admin.zones.remote")}</Badge>}
                    </TD>
                    <TD>
                      <input
                        className="h-8 w-24 rounded-md border border-border bg-input px-2 text-end text-[12.5px] tnum"
                        value={editValue(z, "fee")}
                        onChange={(e) => setEdit(z, "fee", e.target.value)}
                        dir="ltr"
                      />
                    </TD>
                    <TD className="hidden text-end text-muted-foreground tnum sm:table-cell">{money(z.returnFee)}</TD>
                    <TD>
                      <div className="flex items-center gap-1">
                        <input
                          className="h-8 w-14 rounded-md border border-border bg-input px-2 text-end text-[12.5px] tnum"
                          value={editValue(z, "eta")}
                          onChange={(e) => setEdit(z, "eta", e.target.value)}
                          dir="ltr"
                        />
                        <span className="text-[11px] text-faint">{t("admin.zones.hours")}</span>
                      </div>
                    </TD>
                    <TD>
                      {dirty && (
                        <Button size="sm" variant="outline" onClick={() => saveZone(z)}>{t("common.save")}</Button>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="sm">
          <DialogTitle>{t("admin.zones.newCity")}</DialogTitle>
          <DialogDescription>{t("admin.zones.subtitle")}</DialogDescription>
          <div className="mt-3 grid gap-3">
            <div className="grid grid-cols-3 gap-2">
              <Field label="FR">
                <Input value={form.nameFr} onChange={(e) => setForm((f) => ({ ...f, nameFr: e.target.value }))} />
              </Field>
              <Field label="AR">
                <Input value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} dir="rtl" />
              </Field>
              <Field label="EN">
                <Input value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} dir="ltr" />
              </Field>
            </div>
            <Field label={t("admin.zones.regionLabel")}>
              <Select value={form.regionId} onChange={(e) => setForm((f) => ({ ...f, regionId: e.target.value }))}>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.nameFr}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`${t("admin.zones.table.fee")} (DH)`}>
                <Input value={form.deliveryFee} onChange={(e) => setForm((f) => ({ ...f, deliveryFee: e.target.value }))} dir="ltr" />
              </Field>
              <Field label={`${t("admin.zones.table.eta")} (${t("admin.zones.hours")})`}>
                <Input value={form.etaHours} onChange={(e) => setForm((f) => ({ ...f, etaHours: e.target.value }))} dir="ltr" />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={form.isRemote} onChange={(e) => setForm((f) => ({ ...f, isRemote: e.target.checked }))} className="size-4 accent-[var(--primary)]" />
              {t("admin.zones.remote")} (× {remoteMultiplier})
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
            <Button
              disabled={busy || !form.nameFr || !form.regionId}
              onClick={async () => {
                setBusy(true);
                const res = await createCityAction({
                  nameFr: form.nameFr, nameAr: form.nameAr || form.nameFr, nameEn: form.nameEn || form.nameFr,
                  regionId: form.regionId,
                  deliveryFee: Math.round(Number(form.deliveryFee.replace(",", ".")) * 100),
                  etaHours: Number(form.etaHours) || 48,
                  isRemote: form.isRemote,
                });
                setBusy(false);
                toast.push({ title: res.ok ? t("admin.zones.updated") : res.message ?? t("common.errorTitle"), variant: res.ok ? "success" : "error" });
                if (res.ok) { setCreateOpen(false); router.refresh(); }
              }}
            >
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
