"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck,
  Package,
  AlertTriangle,
  Wallet,
  Search,
  Map as MapIcon,
  Table as TableIcon,
  Phone,
  MessageCircle,
  UserPlus,
  Printer,
  Download,
  CheckSquare,
  Square,
  Bike,
  Car,
  X,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/shared";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { assignCourierAction } from "@/server/actions";
import { DeliveryMap, type MapPoint } from "@/components/map";
import { toCsv } from "@/lib/utils";

export type MerchantDeliveryItem = {
  id: string;
  orderId: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  deliveryCity: string;
  deliveryAddress: string;
  status: string;
  attempts: number;
  codAmount: number;
  courierId: string | null;
  courierName: string | null;
  courierPhone: string | null;
  courierVehicle: string | null;
  lastAttemptReason?: string | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CourierOption = {
  id: string;
  name: string;
  city: string;
  phone: string;
  vehicle: string;
};

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Casablanca: { lat: 33.5731, lng: -7.5898 },
  Mohammedia: { lat: 33.6866, lng: -7.383 },
  Rabat: { lat: 34.0209, lng: -6.8416 },
  Salé: { lat: 34.0531, lng: -6.798 },
  Marrakech: { lat: 31.6295, lng: -7.9811 },
  Fès: { lat: 34.0181, lng: -5.0078 },
  Tanger: { lat: 35.7595, lng: -5.834 },
  Agadir: { lat: 30.4278, lng: -9.5981 },
  Meknès: { lat: 33.8935, lng: -5.5473 },
  Kénitra: { lat: 34.261, lng: -6.5802 },
};

export function MerchantDeliveriesClient({
  deliveries,
  couriers,
  cities,
  merchantName,
}: {
  deliveries: MerchantDeliveryItem[];
  couriers: CourierOption[];
  cities: string[];
  merchantName: string;
}) {
  const { t, money } = useI18n();
  const router = useRouter();
  const toast = useToast();

  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [cityFilter, setCityFilter] = React.useState("ALL");
  const [courierFilter, setCourierFilter] = React.useState("ALL");
  const [viewMode, setViewMode] = React.useState<"table" | "map">("table");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // Reassign dialog state
  const [reassigning, setReassigning] = React.useState<MerchantDeliveryItem | null>(null);
  const [selectedCourierId, setSelectedCourierId] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // Manifest modal
  const [manifestOpen, setManifestOpen] = React.useState(false);

  // KPIs
  const stats = React.useMemo(() => {
    let enRoute = 0;
    let assignees = 0;
    let failed = 0;
    let totalCod = 0;

    for (const d of deliveries) {
      if (["IN_TRANSIT", "OUT_FOR_DELIVERY", "PICKED_UP"].includes(d.status)) enRoute++;
      if (d.status === "ASSIGNED") assignees++;
      if (d.attempts > 0 || d.status === "FAILED") failed++;
      totalCod += d.codAmount;
    }

    return { enRoute, assignees, failed, totalCod, total: deliveries.length };
  }, [deliveries]);

  // Filtering
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return deliveries.filter((d) => {
      const matchText =
        !q ||
        [d.reference, d.customerName, d.customerPhone, d.deliveryCity, d.deliveryAddress, d.courierName ?? ""]
          .some((v) => v.toLowerCase().includes(q));

      const matchStatus = statusFilter === "ALL" || d.status === statusFilter;
      const matchCity = cityFilter === "ALL" || d.deliveryCity === cityFilter;
      const matchCourier = courierFilter === "ALL" || d.courierId === courierFilter;

      return matchText && matchStatus && matchCity && matchCourier;
    });
  }, [deliveries, query, statusFilter, cityFilter, courierFilter]);

  // Map points
  const mapPoints: MapPoint[] = React.useMemo(() => {
    return filtered.map((d) => {
      const coords =
        d.gpsLat && d.gpsLng
          ? { lat: d.gpsLat, lng: d.gpsLng }
          : CITY_COORDS[d.deliveryCity] ?? { lat: 31.6295, lng: -7.9811 };

      const color =
        d.status === "OUT_FOR_DELIVERY"
          ? "#0E7A5F"
          : d.status === "IN_TRANSIT"
          ? "#2F45E0"
          : d.attempts > 0
          ? "#DC2626"
          : "#6B7280";

      return {
        lat: coords.lat,
        lng: coords.lng,
        label: `${d.reference} — ${d.customerName} (${money(d.codAmount)})`,
        color,
      };
    });
  }, [filtered, money]);

  // Selection toggle
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((d) => d.id)));
    }
  }

  // WhatsApp Link Helper
  function openWhatsApp(d: MerchantDeliveryItem) {
    const cleanPhone = d.customerPhone.replace(/\D/g, "");
    const intlPhone = cleanPhone.startsWith("0") ? "212" + cleanPhone.slice(1) : cleanPhone;
    const msg = encodeURIComponent(
      `Bonjour ${d.customerName}, nous vous contactons concernant votre commande Masar ${d.reference} (${(d.codAmount / 100).toFixed(2)} DH). Votre livreur est actuellement en route.`
    );
    window.open(`https://wa.me/${intlPhone}?text=${msg}`, "_blank");
  }

  // Reassign handler
  async function confirmReassign() {
    if (!reassigning || !selectedCourierId) return;
    setBusy(true);
    const res = await assignCourierAction(reassigning.orderId, selectedCourierId);
    setBusy(false);
    if (res.ok) {
      toast.push({ title: t("settings.saved"), variant: "success" });
      setReassigning(null);
      router.refresh();
    } else {
      toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
    }
  }

  // CSV Export
  function exportSelected() {
    const itemsToExport = selectedIds.size > 0
      ? filtered.filter((d) => selectedIds.has(d.id))
      : filtered;

    const rows = itemsToExport.map((d) => ({
      Reference: d.reference,
      Client: d.customerName,
      Telephone: d.customerPhone,
      Ville: d.deliveryCity,
      Adresse: d.deliveryAddress,
      Statut: d.status,
      Tentatives: d.attempts,
      COD_DH: (d.codAmount / 100).toFixed(2),
      Livreur: d.courierName ?? "Non assigné",
    }));

    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `livraisons-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectedDeliveries = deliveries.filter((d) => selectedIds.has(d.id));
  const manifestItems = selectedDeliveries.length > 0 ? selectedDeliveries : filtered;
  const manifestTotalCod = manifestItems.reduce((sum, item) => sum + item.codAmount, 0);

  return (
    <div className="space-y-4">
      {/* ── 1. KPI Summary Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* En route */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-muted-foreground">{t("deliveries.kpi.active")}</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-info-soft text-info">
              <Truck className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-[22px] font-semibold tracking-tight">{stats.enRoute}</p>
        </div>

        {/* Assignées */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-muted-foreground">{t("deliveries.kpi.assigned")}</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Package className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-[22px] font-semibold tracking-tight">{stats.assignees}</p>
        </div>

        {/* À relancer */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-muted-foreground">{t("deliveries.kpi.failed")}</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-error-soft text-error">
              <AlertTriangle className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-[22px] font-semibold tracking-tight">{stats.failed}</p>
        </div>

        {/* Total COD */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-muted-foreground">{t("deliveries.kpi.codTotal")}</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-success-soft text-success">
              <Wallet className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-[20px] font-semibold text-success tnum">{money(stats.totalCod, { compact: true })}</p>
        </div>
      </div>

      {/* ── 2. Filters & Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 shadow-xs">
        {/* Search */}
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${t("common.search")} (Ref, client, tel…)`}
            className="ps-9"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status */}
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
            <option value="ALL">{t("common.allStatus")}</option>
            <option value="ASSIGNED">Assignée</option>
            <option value="PICKED_UP">Ramassée</option>
            <option value="IN_TRANSIT">En transit</option>
            <option value="OUT_FOR_DELIVERY">En cours</option>
            <option value="FAILED">Échouée</option>
          </Select>

          {/* City */}
          <Select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="w-36">
            <option value="ALL">{t("common.allCities")}</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>

          {/* Courier */}
          <Select value={courierFilter} onChange={(e) => setCourierFilter(e.target.value)} className="w-40">
            <option value="ALL">{t("common.allCouriers")}</option>
            {couriers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
            ))}
          </Select>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border bg-surface-2 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                viewMode === "table" ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableIcon className="size-3.5" />
              <span>{t("deliveries.view.table")}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                viewMode === "map" ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MapIcon className="size-3.5" />
              <span>{t("deliveries.view.map")}</span>
            </button>
          </div>

          {/* Manifest Print Button */}
          <Button variant="outline" size="sm" onClick={() => setManifestOpen(true)}>
            <Printer className="size-3.5" />
            <span className="hidden sm:inline">{t("deliveries.manifest.print")}</span>
            {selectedIds.size > 0 && <span className="ms-1 font-semibold tnum">({selectedIds.size})</span>}
          </Button>

          {/* CSV Export */}
          <Button variant="ghost" size="iconSm" onClick={exportSelected} title="Exporter CSV">
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      {/* ── 3. Main Content: Table or Map ── */}
      {viewMode === "map" ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface p-2 shadow-xs">
          <DeliveryMap points={mapPoints} height={480} zoom={11} />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface shadow-xs">
          {filtered.length === 0 ? (
            <EmptyState icon="Truck" title={t("deliveries.empty")} description={t("deliveries.emptyDesc")} />
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH className="w-10">
                    <button type="button" onClick={toggleSelectAll} className="flex items-center">
                      {selectedIds.size === filtered.length && filtered.length > 0 ? (
                        <CheckSquare className="size-4 text-primary" />
                      ) : (
                        <Square className="size-4 text-faint" />
                      )}
                    </button>
                  </TH>
                  <TH>{t("deliveries.table.order")}</TH>
                  <TH>{t("orders.table.customer")}</TH>
                  <TH>{t("common.city")}</TH>
                  <TH>{t("common.status")}</TH>
                  <TH className="text-center">{t("deliveries.table.attempts")}</TH>
                  <TH className="text-end">{t("deliveries.table.cod")}</TH>
                  <TH className="hidden lg:table-cell">{t("common.courier")}</TH>
                  <TH className="text-end">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((d) => {
                  const isSelected = selectedIds.has(d.id);
                  return (
                    <TR key={d.id} className={isSelected ? "bg-primary-soft/30" : undefined}>
                      <TD className="w-10">
                        <button type="button" onClick={() => toggleSelect(d.id)} className="flex items-center">
                          {isSelected ? (
                            <CheckSquare className="size-4 text-primary" />
                          ) : (
                            <Square className="size-4 text-faint" />
                          )}
                        </button>
                      </TD>
                      <TD>
                        <Link
                          href={`/app/orders/${d.orderId}`}
                          className="font-semibold tnum text-foreground hover:text-primary hover:underline"
                        >
                          {d.reference}
                        </Link>
                      </TD>
                      <TD>
                        <p className="font-medium text-foreground">{d.customerName}</p>
                        <p className="text-[11.5px] text-faint tnum">{d.customerPhone}</p>
                      </TD>
                      <TD>
                        <p className="font-medium text-foreground">{d.deliveryCity}</p>
                        <p className="max-w-[200px] truncate text-[11.5px] text-muted-foreground">{d.deliveryAddress}</p>
                      </TD>
                      <TD>
                        <StatusBadge status={d.status} />
                      </TD>
                      <TD className="text-center">
                        <span
                          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold tnum ${
                            d.attempts > 1
                              ? "bg-error-soft text-error"
                              : d.attempts === 1
                              ? "bg-warning-soft text-warning"
                              : "text-muted-foreground"
                          }`}
                        >
                          {d.attempts}/3
                        </span>
                        {d.lastAttemptReason && (
                          <p className="max-w-[140px] truncate text-[10.5px] text-error">{d.lastAttemptReason}</p>
                        )}
                      </TD>
                      <TD className="text-end font-semibold tnum">
                        {d.codAmount > 0 ? (
                          <span className="text-success">{money(d.codAmount)}</span>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </TD>
                      <TD className="hidden lg:table-cell">
                        {d.courierName ? (
                          <div className="flex items-center gap-1.5">
                            {d.courierVehicle === "CAR" ? (
                              <Car className="size-3.5 text-muted-foreground" />
                            ) : (
                              <Bike className="size-3.5 text-muted-foreground" />
                            )}
                            <span className="text-[13px] font-medium text-foreground">{d.courierName}</span>
                          </div>
                        ) : (
                          <span className="text-[12px] italic text-faint">{t("common.unassigned")}</span>
                        )}
                      </TD>
                      <TD className="text-end">
                        <div className="inline-flex items-center gap-1">
                          {/* WhatsApp */}
                          <button
                            type="button"
                            onClick={() => openWhatsApp(d)}
                            className="rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            title="Contacter par WhatsApp"
                          >
                            <MessageCircle className="size-4" />
                          </button>

                          {/* Call Customer */}
                          <a
                            href={`tel:${d.customerPhone}`}
                            className="rounded-lg p-1.5 text-faint transition-colors hover:bg-muted hover:text-foreground"
                            title={`Appeler ${d.customerName}`}
                          >
                            <Phone className="size-4" />
                          </a>

                          {/* Reassign courier */}
                          <button
                            type="button"
                            onClick={() => {
                              setReassigning(d);
                              setSelectedCourierId(d.courierId ?? "");
                            }}
                            className="rounded-lg p-1.5 text-faint transition-colors hover:bg-muted hover:text-foreground"
                            title={t("deliveries.reassign")}
                          >
                            <UserPlus className="size-4" />
                          </button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </div>
      )}

      {/* ── 4. Reassign Courier Dialog ── */}
      <Dialog open={!!reassigning} onOpenChange={(o) => !o && setReassigning(null)}>
        <DialogContent size="sm">
          <DialogTitle>{t("deliveries.reassign")}</DialogTitle>
          <DialogDescription>
            {reassigning?.reference} — {reassigning?.customerName} ({reassigning?.deliveryCity})
          </DialogDescription>
          <div className="mt-3 space-y-2">
            <label className="text-[12px] font-medium text-muted-foreground">{t("common.courier")}</label>
            <Select value={selectedCourierId} onChange={(e) => setSelectedCourierId(e.target.value)}>
              <option value="">{t("common.selectCourier")}</option>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.city} ({c.vehicle})
                </option>
              ))}
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReassigning(null)}>
              {t("common.cancel")}
            </Button>
            <Button disabled={!selectedCourierId || busy} onClick={confirmReassign}>
              <CheckCircle2 className="size-3.5" /> {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 5. Printable Delivery Manifest (Bordereau) Modal ── */}
      <Dialog open={manifestOpen} onOpenChange={setManifestOpen}>
        <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
          <DialogTitle className="flex items-center justify-between border-b pb-3">
            <span>{t("deliveries.manifest.title")}</span>
            <Button size="sm" onClick={() => window.print()} className="gap-1.5">
              <Printer className="size-3.5" />
              <span>Imprimer</span>
            </Button>
          </DialogTitle>

          <div id="printable-manifest" className="space-y-4 p-2 text-[12px]">
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <p className="text-[16px] font-bold text-primary">MASAR · LOGISTIQUE</p>
                <p className="text-[13px] font-medium text-foreground">{merchantName}</p>
                <p className="text-faint">{t("deliveries.manifest.date")}: {new Date().toLocaleDateString("fr-MA")} {new Date().toLocaleTimeString("fr-MA", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <div className="text-end">
                <p className="text-[14px] font-semibold text-foreground">
                  {t("deliveries.manifest.totalParcels")}: <span className="text-primary">{manifestItems.length}</span>
                </p>
                <p className="text-[14px] font-bold text-success">
                  {t("deliveries.manifest.totalCod")}: {money(manifestTotalCod)}
                </p>
              </div>
            </div>

            {/* Manifest Table */}
            <table className="w-full border-collapse text-start text-[11.5px]">
              <thead>
                <tr className="border-b bg-surface-2">
                  <th className="p-2 text-start">N°</th>
                  <th className="p-2 text-start">Réf</th>
                  <th className="p-2 text-start">Destinataire</th>
                  <th className="p-2 text-start">Ville / Adresse</th>
                  <th className="p-2 text-start">Téléphone</th>
                  <th className="p-2 text-end">Montant COD</th>
                  <th className="p-2 text-start">Livreur</th>
                  <th className="p-2 text-center">Émargement</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {manifestItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="p-2 text-faint">{idx + 1}</td>
                    <td className="p-2 font-mono font-semibold">{item.reference}</td>
                    <td className="p-2 font-medium">{item.customerName}</td>
                    <td className="max-w-44 truncate p-2">{item.deliveryCity} - {item.deliveryAddress}</td>
                    <td className="p-2 font-mono">{item.customerPhone}</td>
                    <td className="p-2 text-end font-bold text-success">{money(item.codAmount)}</td>
                    <td className="p-2">{item.courierName ?? "—"}</td>
                    <td className="p-2 text-center text-faint">___________</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Signature Boxes */}
            <div className="mt-8 grid grid-cols-2 gap-8 border-t pt-6">
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <p className="font-semibold text-foreground">{t("deliveries.manifest.signatureMerchant")}</p>
                <p className="mt-8 text-[11px] text-faint">(Signature et cachet de l'expéditeur)</p>
              </div>
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <p className="font-semibold text-foreground">{t("deliveries.manifest.signatureCourier")}</p>
                <p className="mt-8 text-[11px] text-faint">(Signature avec mention « Bon pour réception »)</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

