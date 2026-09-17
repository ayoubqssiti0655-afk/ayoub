"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bike, MoreHorizontal, Plus, Power, Search, Download, CheckCircle2, MapPin, Truck, Copy, Eye, KeyRound } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/shared";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { createCourierAction, resetCourierPasswordAction, setCourierStatusAction } from "@/server/admin-actions";
import { Avatar } from "@/components/ui/misc";
import { avatarHue } from "@/lib/format";

export type CourierRow = {
  id: string; name: string; email: string; employeeCode: string; city: string; vehicle: string;
  status: string; rating: number; delivered: number; successRate: number; earnings: number; lastSeenAt: string | null;
};

export function CouriersClient({ rows, cities }: { rows: CourierRow[]; cities: string[] }) {
  const { t, money, num, pct, date } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = React.useState("");
  const [cityFilter, setCityFilter] = React.useState("ALL");
  const [vehicleFilter, setVehicleFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [sortBy, setSortBy] = React.useState("code");
  const [confirmCourier, setConfirmCourier] = React.useState<CourierRow | null>(null);
  const [passwordCourier, setPasswordCourier] = React.useState<CourierRow | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", email: "", password: "", city: cities[0] ?? "Casablanca", phone: "", vehicle: "MOTORCYCLE" });

  const filteredRows = React.useMemo(() => {
    const text = q.trim().toLowerCase();
    const filtered = rows.filter((courier) => {
      const matchesText = !text || [courier.name, courier.email, courier.employeeCode, courier.city].some((value) => value.toLowerCase().includes(text));
      const matchesCity = cityFilter === "ALL" || courier.city === cityFilter;
      const matchesVehicle = vehicleFilter === "ALL" || courier.vehicle === vehicleFilter;
      const matchesStatus = statusFilter === "ALL" || courier.status === statusFilter;
      return matchesText && matchesCity && matchesVehicle && matchesStatus;
    });
    return [...filtered].sort((left, right) => {
      if (sortBy === "success") return right.successRate - left.successRate;
      if (sortBy === "delivered") return right.delivered - left.delivered;
      if (sortBy === "earnings") return right.earnings - left.earnings;
      return left.employeeCode.localeCompare(right.employeeCode);
    });
  }, [rows, q, cityFilter, vehicleFilter, statusFilter, sortBy]);

  const stats = React.useMemo(() => {
    const active = rows.filter((courier) => courier.status === "ACTIVE").length;
    const inactive = rows.filter((courier) => courier.status !== "ACTIVE").length;
    const averageSuccess = rows.length ? rows.reduce((sum, courier) => sum + courier.successRate, 0) / rows.length : 0;
    const totalEarnings = rows.reduce((sum, courier) => sum + courier.earnings, 0);
    return { active, inactive, averageSuccess, totalEarnings };
  }, [rows]);

  function exportCsv(list: CourierRow[]) {
    const header = ["Nom", "Email", "Code", "Ville", "Véhicule", "Livrées", "Réussite", "Note", "Gains", "Statut"];
    const lines = list.map((courier) => [courier.name, courier.email, courier.employeeCode, courier.city, courier.vehicle, String(courier.delivered), String(Math.round(courier.successRate * 100)), courier.rating.toFixed(1), String(courier.earnings), courier.status]);
    const csv = [header, ...lines].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "livreurs.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function toggleStatus(courier: CourierRow) {
    setBusy(true);
    const next = courier.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const res = await setCourierStatusAction(courier.id, next);
    setBusy(false);
    toast.push({ title: res.ok ? "Statut mis à jour" : res.message ?? t("common.errorTitle"), variant: res.ok ? "success" : "error" });
    if (res.ok) { setConfirmCourier(null); router.refresh(); }
  }

  async function resetPassword() {
    if (!passwordCourier) return;
    setBusy(true);
    const res = await resetCourierPasswordAction(passwordCourier.id, newPassword);
    setBusy(false);
    toast.push({ title: res.ok ? "Accès mis à jour" : res.message ?? t("common.errorTitle"), variant: res.ok ? "success" : "error" });
    if (res.ok) { setPasswordCourier(null); setNewPassword(""); }
  }

  return (
    <>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {[
          { label: "Total livreurs", value: String(rows.length), icon: Truck, tone: "primary" },
          { label: "Actifs", value: String(stats.active), icon: CheckCircle2, tone: "success" },
          { label: "Disponibilité à revoir", value: String(stats.inactive), icon: MapPin, tone: "warning" },
          { label: "Réussite moyenne", value: pct(stats.averageSuccess, 0), icon: Bike, tone: "info" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-xl border border-border bg-surface p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.08em] text-faint">{label}</p>
              <div className={`flex size-8 items-center justify-center rounded-lg ${tone === "primary" ? "bg-primary-soft text-primary" : tone === "success" ? "bg-success-soft text-success" : tone === "warning" ? "bg-warning-soft text-warning" : "bg-info-soft text-info"}`}><Icon className="size-4" /></div>
            </div>
            <p className="mt-3 text-[24px] font-semibold tracking-[-0.03em] tnum">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form className="relative min-w-48 flex-1 sm:max-w-xs" onSubmit={(e) => { e.preventDefault(); router.push(`/admin/couriers?q=${encodeURIComponent(q)}`); }}>
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.search")} className="ps-8" />
        </form>
        <Select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="min-w-[125px]">
          <option value="ALL">Toutes villes</option>
          {cities.map((city) => <option key={city} value={city}>{city}</option>)}
        </Select>
        <Select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="min-w-[125px]">
          <option value="ALL">Tous véhicules</option>
          {['MOTORCYCLE', 'CAR', 'VAN'].map((vehicle) => <option key={vehicle} value={vehicle}>{t(`vehicle.${vehicle}`)}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-[125px]">
          <option value="ALL">Tous statuts</option>
          <option value="ACTIVE">Actif</option>
          <option value="INACTIVE">Inactif</option>
          <option value="SUSPENDED">Suspendu</option>
        </Select>
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="min-w-[145px]">
          <option value="code">Tri par code</option>
          <option value="success">Meilleure réussite</option>
          <option value="delivered">Plus livrés</option>
          <option value="earnings">Plus de gains</option>
        </Select>
        <Button variant="outline" size="sm" onClick={() => exportCsv(filteredRows)}>
          <Download className="size-3.5" /> Exporter
        </Button>
        <Button size="sm" className="ms-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" /> {t("admin.couriers.new")}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-xs">
        {filteredRows.length === 0 ? (
          <EmptyState icon={Bike} title={t("common.noResults")} />
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>{t("common.name")}</TH>
                <TH className="hidden md:table-cell">{t("common.city")}</TH>
                <TH className="hidden lg:table-cell">{t("common.vehicle")}</TH>
                <TH className="text-end">{t("admin.couriers.table.delivered")}</TH>
                <TH className="hidden text-end sm:table-cell">{t("admin.couriers.table.success")}</TH>
                <TH className="text-end">{t("courier.rating")}</TH>
                <TH className="hidden text-end lg:table-cell">{t("admin.couriers.table.earnings")}</TH>
                <TH>{t("common.status")}</TH>
                <TH className="hidden lg:table-cell">Dernière activité</TH>
                <TH className="w-10" />
              </TR>
            </THead>
            <TBody>
              {filteredRows.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <a href={`/admin/couriers/${c.id}`} className="flex items-center gap-2 font-semibold hover:text-primary hover:underline">
                      <Avatar name={c.name} size={26} hue={avatarHue(c.name)} />
                      {c.name}
                    </a>
                    <p className="ps-8 text-[11.5px] text-faint tnum">{c.employeeCode}</p>
                  </TD>
                  <TD className="hidden md:table-cell">{c.city}</TD>
                  <TD className="hidden lg:table-cell">
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px]">{t(`vehicle.${c.vehicle}`)}</span>
                  </TD>
                  <TD className="text-end tnum">{num(c.delivered)}</TD>
                  <TD className="hidden text-end sm:table-cell">
                    <Badge tone={c.successRate >= 0.85 ? "success" : c.successRate >= 0.7 ? "warning" : "error"}>{pct(c.successRate, 0)}</Badge>
                  </TD>
                  <TD className="text-end tnum">★ {c.rating.toFixed(1)}</TD>
                  <TD className="hidden text-end font-medium tnum lg:table-cell">{money(c.earnings, { compact: true })}</TD>
                  <TD><StatusBadge status={c.status} size="sm" /></TD>
                  <TD className="hidden text-muted-foreground tnum lg:table-cell">
                    {c.lastSeenAt && Date.now() - new Date(c.lastSeenAt).getTime() < 15 * 60 * 1000 ? "En ligne" : c.lastSeenAt ? date(c.lastSeenAt) : "Jamais"}
                  </TD>
                  <TD>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="iconSm" aria-label={t("common.actions")}><MoreHorizontal className="size-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/admin/couriers/${c.id}`)}><Eye className="size-4" /> Voir le profil</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/admin/couriers/${c.id}`)}><MapPin className="size-4" /> Gérer les zones</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { void navigator.clipboard?.writeText(c.email); toast.push({ title: "Email copié", variant: "success" }); }}><Copy className="size-4" /> Copier l’email</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { void navigator.clipboard?.writeText(c.employeeCode); toast.push({ title: "Code copié", variant: "success" }); }}><Copy className="size-4" /> Copier le code</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPasswordCourier(c)}><KeyRound className="size-4" /> Réinitialiser l’accès</DropdownMenuItem>
                        <DropdownMenuItem destructive={c.status === "ACTIVE"} onClick={() => setConfirmCourier(c)}>
                          <Power /> {c.status === "ACTIVE" ? t("status.INACTIVE") : t("status.ACTIVE")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      <Dialog open={Boolean(confirmCourier)} onOpenChange={(open) => !open && setConfirmCourier(null)}>
        <DialogContent size="sm">
          {confirmCourier && (
            <>
              <DialogTitle>{confirmCourier.status === "ACTIVE" ? "Désactiver ce livreur ?" : "Activer ce livreur ?"}</DialogTitle>
              <DialogDescription>Le changement sera appliqué immédiatement à {confirmCourier.name}.</DialogDescription>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setConfirmCourier(null)}>Annuler</Button>
                <Button variant={confirmCourier.status === "ACTIVE" ? "destructive" : "default"} disabled={busy} onClick={() => toggleStatus(confirmCourier)}>Confirmer</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(passwordCourier)} onOpenChange={(open) => { if (!open) { setPasswordCourier(null); setNewPassword(""); } }}>
        <DialogContent size="sm">
          {passwordCourier && (
            <>
              <DialogTitle>Réinitialiser l’accès</DialogTitle>
              <DialogDescription>Définissez un nouveau mot de passe pour {passwordCourier.name}.</DialogDescription>
              <div className="mt-4">
                <Field label="Nouveau mot de passe">
                  <Input type="password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="8 caractères minimum" />
                </Field>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPasswordCourier(null)}>Annuler</Button>
                <Button disabled={busy || newPassword.length < 8} onClick={resetPassword}>Enregistrer</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="sm">
          <DialogTitle>{t("admin.couriers.new")}</DialogTitle>
          <DialogDescription>{t("admin.couriers.newDesc")}</DialogDescription>
          <div className="mt-3 grid gap-3">
            <Field label={t("common.name")}>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label={t("common.email")}>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} dir="ltr" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("common.phone")}>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0612345678" dir="ltr" />
              </Field>
              <Field label={t("common.city")}>
                <Select value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("common.vehicle")}>
                <Select value={form.vehicle} onChange={(e) => setForm((f) => ({ ...f, vehicle: e.target.value }))}>
                  {["MOTORCYCLE", "CAR", "VAN"].map((v) => <option key={v} value={v}>{t(`vehicle.${v}`)}</option>)}
                </Select>
              </Field>
              <Field label={t("auth.password")}>
                <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
            <Button
              disabled={busy || !form.name || !form.email || form.password.length < 8}
              onClick={async () => {
                setBusy(true);
                const res = await createCourierAction(form);
                setBusy(false);
                toast.push({ title: res.ok ? t("settings.saved") : res.message ?? t("common.errorTitle"), variant: res.ok ? "success" : "error" });
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
