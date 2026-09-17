"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, MoreHorizontal, Power, Search, Download, SlidersHorizontal, Eye, CheckCircle2, UserRoundPen, ClipboardList, WalletCards, Copy, KeyRound, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, Pagination } from "@/components/shared";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { createMerchantAction, deleteMerchantAction, resetMerchantPasswordAction, setMerchantStatusAction } from "@/server/admin-actions";

export type MerchantRow = {
  id: string; name: string; email: string; city: string | null; plan: string;
  status: string; orders: number; wallet: number; createdAt: string;
};

export function MerchantsClient({
  rows, total, page, totalPages, cities,
}: {
  rows: MerchantRow[]; total: number; page: number; totalPages: number; cities: string[];
}) {
  const { t, money, date, num } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [planFilter, setPlanFilter] = React.useState("ALL");
  const [cityFilter, setCityFilter] = React.useState("ALL");
  const [selectedMerchant, setSelectedMerchant] = React.useState<MerchantRow | null>(null);
  const [confirmAction, setConfirmAction] = React.useState<{ type: "status" | "delete"; merchant: MerchantRow } | null>(null);
  const [passwordMerchant, setPasswordMerchant] = React.useState<MerchantRow | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", email: "", password: "", city: cities[0] ?? "Casablanca", phone: "", plan: "growth" });

  const filteredRows = React.useMemo(() => {
    const text = q.trim().toLowerCase();
    return rows.filter((m) => {
      const matchText = !text || [m.name, m.email, m.city ?? "", m.plan].some((value) => value.toLowerCase().includes(text));
      const matchStatus = statusFilter === "ALL" || m.status === statusFilter;
      const matchPlan = planFilter === "ALL" || m.plan === planFilter;
      const matchCity = cityFilter === "ALL" || (m.city ?? "—") === cityFilter;
      return matchText && matchStatus && matchPlan && matchCity;
    });
  }, [rows, q, statusFilter, planFilter, cityFilter]);

  const stats = React.useMemo(() => {
    const totalCount = rows.length;
    const active = rows.filter((m) => m.status === "ACTIVE").length;
    const pending = rows.filter((m) => m.status === "PENDING").length;
    const suspended = rows.filter((m) => m.status === "SUSPENDED").length;
    const revenue = rows.reduce((sum, m) => sum + m.wallet, 0);
    return { totalCount, active, pending, suspended, revenue };
  }, [rows]);

  function exportCsv(list: MerchantRow[]) {
    const header = ["Nom", "Email", "Ville", "Plan", "Statut", "Commandes", "Solde", "Date"]; 
    const rowsCsv = list.map((m) => [m.name, m.email, m.city ?? "", m.plan, m.status, String(m.orders), String(m.wallet), new Date(m.createdAt).toISOString()]);
    const csv = [header, ...rowsCsv].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "marchands.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function toggleStatus(id: string, current: string) {
    const next = current === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    const res = await setMerchantStatusAction(id, next);
    toast.push({ title: res.ok ? t("settings.saved") : res.message ?? t("common.errorTitle"), variant: res.ok ? "success" : "error" });
    if (res.ok) router.refresh();
  }

  async function resetPassword() {
    if (!passwordMerchant) return;
    setBusy(true);
    const res = await resetMerchantPasswordAction(passwordMerchant.id, newPassword);
    setBusy(false);
    toast.push({ title: res.ok ? "Mot de passe mis à jour" : res.message ?? t("common.errorTitle"), variant: res.ok ? "success" : "error" });
    if (res.ok) { setPasswordMerchant(null); setNewPassword(""); }
  }

  async function deleteMerchant() {
    if (!confirmAction || confirmAction.type !== "delete") return;
    setBusy(true);
    const res = await deleteMerchantAction(confirmAction.merchant.id);
    setBusy(false);
    toast.push({ title: res.ok ? "Marchand supprimé" : res.message ?? t("common.errorTitle"), variant: res.ok ? "success" : "error" });
    if (res.ok) { setConfirmAction(null); router.refresh(); }
  }

  return (
    <>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {[
          { label: "Total marchands", value: String(stats.totalCount), icon: Building2, tone: "primary" },
          { label: "Actifs", value: String(stats.active), icon: CheckCircle2, tone: "success" },
          { label: "En attente", value: String(stats.pending), icon: SlidersHorizontal, tone: "warning" },
          { label: "Solde total", value: money(stats.revenue, { compact: true }), icon: Download, tone: "info" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-xl border border-border bg-surface p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.08em] text-faint">{label}</p>
              <div className={`flex size-8 items-center justify-center rounded-lg ${tone === "primary" ? "bg-primary-soft text-primary" : tone === "success" ? "bg-success-soft text-success" : tone === "warning" ? "bg-warning-soft text-warning" : "bg-info-soft text-info"}`}>
                <Icon className="size-4" />
              </div>
            </div>
            <p className="mt-3 text-[24px] font-semibold tracking-[-0.03em] tnum">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form className="relative min-w-48 flex-1 sm:max-w-xs" onSubmit={(e) => { e.preventDefault(); router.push(`/admin/merchants?q=${encodeURIComponent(q)}`); }}>
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.merchants.searchPlaceholder")} className="ps-8" />
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-[120px]">
            <option value="ALL">Tous statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="PENDING">En attente</option>
            <option value="SUSPENDED">Suspendu</option>
          </Select>
          <Select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="min-w-[120px]">
            <option value="ALL">Tous plans</option>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="scale">Scale</option>
          </Select>
          <Select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="min-w-[120px]">
            <option value="ALL">Toutes villes</option>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </Select>
        </div>
        <div className="ms-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCsv(filteredRows)}>
            <Download className="size-3.5" /> Exporter
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" /> {t("admin.merchants.new")}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-xs">
        {filteredRows.length === 0 ? (
          <EmptyState icon={Building2} title={t("common.noResults")} />
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>{t("common.name")}</TH>
                <TH className="hidden md:table-cell">{t("common.city")}</TH>
                <TH>{t("common.plan")}</TH>
                <TH className="text-end">{t("nav.orders")}</TH>
                <TH className="hidden text-end sm:table-cell">{t("wallet.available")}</TH>
                <TH>{t("common.status")}</TH>
                <TH className="hidden lg:table-cell">{t("admin.merchants.table.joined")}</TH>
                <TH className="w-10" />
              </TR>
            </THead>
            <TBody>
              {filteredRows.map((m) => (
                <TR key={m.id}>
                  <TD>
                    <a href={`/admin/merchants/${m.id}`} className="font-semibold hover:text-primary hover:underline">{m.name}</a>
                    <p className="text-[11.5px] text-faint">{m.email}</p>
                  </TD>
                  <TD className="hidden md:table-cell">{m.city ?? "—"}</TD>
                  <TD><span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium">{t(`plan.${m.plan}`)}</span></TD>
                  <TD className="text-end tnum">{num(m.orders)}</TD>
                  <TD className="hidden text-end font-medium tnum sm:table-cell">{money(m.wallet, { compact: true })}</TD>
                  <TD><StatusBadge status={m.status} size="sm" /></TD>
                  <TD className="hidden text-muted-foreground tnum lg:table-cell">{date(m.createdAt)}</TD>
                  <TD>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="iconSm" aria-label={t("common.actions")}><MoreHorizontal className="size-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedMerchant(m)}><Eye className="size-4" /> Aperçu</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/admin/merchants/${m.id}`)}><UserRoundPen className="size-4" /> Voir le profil et modifier</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/admin/orders?merchant=${encodeURIComponent(m.id)}`)}><ClipboardList className="size-4" /> Commandes</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/admin/settlements?merchant=${encodeURIComponent(m.id)}`)}><WalletCards className="size-4" /> Portefeuille et versements</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { void navigator.clipboard?.writeText(m.email); toast.push({ title: "Email copié", variant: "success" }); }}><Copy className="size-4" /> Copier l’email</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPasswordMerchant(m)}><KeyRound className="size-4" /> Réinitialiser le mot de passe</DropdownMenuItem>
                        <DropdownMenuItem destructive={m.status !== "SUSPENDED"} onClick={() => setConfirmAction({ type: "status", merchant: m })}>
                          <Power /> {m.status === "SUSPENDED" ? t("admin.merchants.activate") : t("admin.merchants.suspend")}
                        </DropdownMenuItem>
                        <DropdownMenuItem destructive onClick={() => setConfirmAction({ type: "delete", merchant: m })}><Trash2 className="size-4" /> Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        {filteredRows.length > 0 && (
          <div className="border-t border-border">
            <Pagination page={page} totalPages={totalPages} total={total} per={20} basePath="/admin/merchants" params={{ q }} />
          </div>
        )}
      </div>

      <Dialog open={Boolean(selectedMerchant)} onOpenChange={(open) => !open && setSelectedMerchant(null)}>
        <DialogContent size="md">
          {selectedMerchant && (
            <>
              <DialogTitle>{selectedMerchant.name}</DialogTitle>
              <DialogDescription>{selectedMerchant.email}</DialogDescription>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-surface-2 p-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-faint">Ville</p>
                  <p className="mt-1 font-medium">{selectedMerchant.city ?? "—"}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-2 p-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-faint">Plan</p>
                  <p className="mt-1 font-medium">{t(`plan.${selectedMerchant.plan}`)}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-2 p-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-faint">Commandes</p>
                  <p className="mt-1 font-medium tnum">{num(selectedMerchant.orders)}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-2 p-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-faint">Solde</p>
                  <p className="mt-1 font-medium tnum">{money(selectedMerchant.wallet, { compact: true })}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => setSelectedMerchant(null)}>Fermer</Button>
                <Button onClick={() => router.push(`/admin/merchants/${selectedMerchant.id}`)}>Voir le profil</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent size="sm">
          {confirmAction && (
            <>
              <DialogTitle>{confirmAction.type === "delete" ? "Supprimer ce marchand ?" : confirmAction.merchant.status === "SUSPENDED" ? "Activer ce marchand ?" : "Suspendre ce marchand ?"}</DialogTitle>
              <DialogDescription>
                {confirmAction.type === "delete"
                  ? `${confirmAction.merchant.name} sera supprimé uniquement s’il n’a aucune commande ni transaction financière.`
                  : `Cette action modifiera immédiatement l’accès de ${confirmAction.merchant.name}.`}
              </DialogDescription>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setConfirmAction(null)}>Annuler</Button>
                <Button
                  variant={confirmAction.type === "delete" || confirmAction.merchant.status !== "SUSPENDED" ? "destructive" : "default"}
                  disabled={busy}
                  onClick={async () => {
                    if (confirmAction.type === "delete") await deleteMerchant();
                    else { await toggleStatus(confirmAction.merchant.id, confirmAction.merchant.status); setConfirmAction(null); }
                  }}
                >
                  Confirmer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(passwordMerchant)} onOpenChange={(open) => { if (!open) { setPasswordMerchant(null); setNewPassword(""); } }}>
        <DialogContent size="sm">
          {passwordMerchant && (
            <>
              <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
              <DialogDescription>Définissez un nouveau mot de passe pour le compte propriétaire de {passwordMerchant.name}.</DialogDescription>
              <div className="mt-4">
                <Field label="Nouveau mot de passe">
                  <Input type="password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="8 caractères minimum" />
                </Field>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPasswordMerchant(null)}>Annuler</Button>
                <Button disabled={busy || newPassword.length < 8} onClick={resetPassword}>Enregistrer</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="sm">
          <DialogTitle>{t("admin.merchants.new")}</DialogTitle>
          <DialogDescription>{t("admin.merchants.newDesc")}</DialogDescription>
          <div className="mt-3 grid gap-3">
            <Field label={t("auth.businessName")}>
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
              <Field label={t("common.plan")}>
                <Select value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}>
                  {["starter", "growth", "scale"].map((p) => <option key={p} value={p}>{t(`plan.${p}`)}</option>)}
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
                const res = await createMerchantAction(form);
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
