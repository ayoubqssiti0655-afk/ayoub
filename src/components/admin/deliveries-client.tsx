"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Download, Eye, Filter, Map as MapIcon, MoreHorizontal, RefreshCw, Search, UserPlus } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/shared";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { adminAssignCourierAction } from "@/server/admin-actions";
import { DeliveryMap, type MapPoint } from "@/components/map";

export type AdminDeliveryRow = {
  id: string;
  orderId: string;
  reference: string;
  merchant: string;
  customer: string;
  city: string;
  status: string;
  attempts: number;
  courierId: string | null;
  courierName: string | null;
  updatedAt: string;
  nextActionAt: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
};

type CourierOption = { id: string; name: string; city: string };

export function DeliveriesClient({ rows, couriers, cities }: { rows: AdminDeliveryRow[]; couriers: CourierOption[]; cities: string[] }) {
  const { t, date } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("ALL");
  const [city, setCity] = React.useState("ALL");
  const [courier, setCourier] = React.useState("ALL");
  const [showMap, setShowMap] = React.useState(false);
  const [assigning, setAssigning] = React.useState<AdminDeliveryRow | null>(null);
  const [selectedCourier, setSelectedCourier] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const filtered = React.useMemo(() => {
    const text = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesText = !text || [row.reference, row.merchant, row.customer, row.city, row.courierName ?? ""].some((value) => value.toLowerCase().includes(text));
      return matchesText && (status === "ALL" || row.status === status) && (city === "ALL" || row.city === city) && (courier === "ALL" || row.courierId === courier);
    });
  }, [rows, query, status, city, courier]);

  const stats = React.useMemo(() => ({
    total: rows.length,
    unassigned: rows.filter((row) => !row.courierId).length,
    failed: rows.filter((row) => row.status === "FAILED").length,
    urgent: rows.filter((row) => row.attempts >= 2 || (row.nextActionAt && new Date(row.nextActionAt) <= new Date())).length,
  }), [rows]);

  const mapPoints: MapPoint[] = filtered.filter((row) => row.gpsLat !== null && row.gpsLng !== null).map((row) => ({
    lat: row.gpsLat!, lng: row.gpsLng!, label: row.reference.slice(-4), color: row.status === "FAILED" ? "#C83232" : "#2F45E0",
  }));

  async function assignCourier() {
    if (!assigning || !selectedCourier) return;
    setBusy(true);
    const result = await adminAssignCourierAction(assigning.orderId, selectedCourier);
    setBusy(false);
    toast.push({ title: result.ok ? t("deliveries.assigned") : result.message ?? t("common.errorTitle"), variant: result.ok ? "success" : "error" });
    if (result.ok) { setAssigning(null); setSelectedCourier(""); router.refresh(); }
  }

  function exportCsv() {
    const header = ["Commande", "Marchand", "Client", "Ville", "Statut", "Tentatives", "Livreur", "Dernière mise à jour"];
    const lines = filtered.map((row) => [row.reference, row.merchant, row.customer, row.city, row.status, `${row.attempts}/3`, row.courierName ?? "", row.updatedAt]);
    const csv = [header, ...lines].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "livraisons.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {[
          ["Livraisons actives", stats.total],
          ["Non assignées", stats.unassigned],
          ["Échecs", stats.failed],
          ["À surveiller", stats.urgent],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-border bg-surface p-3 shadow-xs">
            <p className="text-[11px] uppercase tracking-[0.08em] text-faint">{label}</p>
            <p className="mt-3 text-[24px] font-semibold tracking-[-0.03em] tnum">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form className="relative min-w-52 flex-1 sm:max-w-xs" onSubmit={(event) => event.preventDefault()}>
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher commande, client, ville..." className="ps-8" />
        </form>
        <Select value={status} onChange={(event) => setStatus(event.target.value)} className="min-w-[135px]"><option value="ALL">Tous statuts</option>{[...new Set(rows.map((row) => row.status))].map((value) => <option key={value} value={value}>{t(`status.${value}`)}</option>)}</Select>
        <Select value={city} onChange={(event) => setCity(event.target.value)} className="min-w-[125px]"><option value="ALL">Toutes villes</option>{cities.map((value) => <option key={value} value={value}>{value}</option>)}</Select>
        <Select value={courier} onChange={(event) => setCourier(event.target.value)} className="min-w-[135px]"><option value="ALL">Tous livreurs</option>{couriers.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}</Select>
        <Button variant={showMap ? "default" : "outline"} size="sm" onClick={() => setShowMap((value) => !value)}><MapIcon className="size-3.5" /> Carte</Button>
        <Button variant="outline" size="sm" onClick={() => router.refresh()}><RefreshCw className="size-3.5" /> Actualiser</Button>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="size-3.5" /> Exporter</Button>
      </div>

      {showMap && <div className="mb-4"><DeliveryMap points={mapPoints} height={300} /></div>}

      <div className="rounded-xl border border-border bg-surface shadow-xs">
        {filtered.length === 0 ? <EmptyState icon={ClipboardList} title={t("deliveries.empty")} /> : (
          <Table>
            <THead><TR className="hover:bg-transparent"><TH>Commande</TH><TH>Marchand</TH><TH>Client</TH><TH>Ville</TH><TH>Statut</TH><TH className="text-center">Tentatives</TH><TH className="hidden lg:table-cell">Livreur</TH><TH className="w-10" /></TR></THead>
            <TBody>{filtered.map((row) => (
              <TR key={row.id}>
                <TD><Link href={`/admin/orders/${row.orderId}`} className="font-semibold tnum hover:text-primary hover:underline">{row.reference}</Link></TD>
                <TD className="text-muted-foreground">{row.merchant}</TD>
                <TD className="font-medium">{row.customer}</TD>
                <TD>{row.city}</TD>
                <TD><StatusBadge status={row.status} /></TD>
                <TD className={`text-center tnum ${row.attempts >= 2 ? "font-semibold text-error" : ""}`}>{row.attempts}/3</TD>
                <TD className="hidden text-muted-foreground lg:table-cell">{row.courierName ?? t("common.unassigned")}</TD>
                <TD><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="iconSm" aria-label="Actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => router.push(`/admin/orders/${row.orderId}`)}><Eye className="size-4" /> Voir le détail</DropdownMenuItem><DropdownMenuItem onClick={() => { setAssigning(row); setSelectedCourier(row.courierId ?? ""); }}><UserPlus className="size-4" /> {row.courierId ? "Changer le livreur" : t("deliveries.assign")}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TD>
              </TR>
            ))}</TBody>
          </Table>
        )}
      </div>

      <Dialog open={Boolean(assigning)} onOpenChange={(open) => !open && setAssigning(null)}>
        <DialogContent size="sm"><DialogTitle>{t("deliveries.assign")}</DialogTitle><DialogDescription>{t("deliveries.assignDesc")}</DialogDescription><div className="mt-3"><Select value={selectedCourier} onChange={(event) => setSelectedCourier(event.target.value)}><option value="">{t("common.selectCourier")}</option>{couriers.map((value) => <option key={value.id} value={value.id}>{value.name} — {value.city}</option>)}</Select></div><DialogFooter><Button variant="ghost" onClick={() => setAssigning(null)}>{t("common.cancel")}</Button><Button disabled={!selectedCourier || busy} onClick={assignCourier}>{t("common.confirm")}</Button></DialogFooter></DialogContent>
      </Dialog>
    </>
  );
}
