"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banknote, CheckCircle2, Download, Eye, MoreHorizontal, Search } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/shared";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { markSettlementPaidAction } from "@/server/admin-actions";

export type SettlementRowView = {
  id: string; reference: string; merchantName: string; grossCOD: number; fees: number;
  netAmount: number; status: string; method: string; periodStart: string | null; periodEnd: string | null; paidAt: string | null; createdAt: string; paymentReference: string | null; paymentNote: string | null;
};

export function SettlementsClient({ rows }: { rows: SettlementRowView[] }) {
  const { t, money, date } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("ALL");
  const [method, setMethod] = React.useState("ALL");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<SettlementRowView | null>(null);
  const [paying, setPaying] = React.useState<SettlementRowView | null>(null);
  const [paymentReference, setPaymentReference] = React.useState("");
  const [paymentNote, setPaymentNote] = React.useState("");

  const filteredRows = React.useMemo(() => rows.filter((row) => {
    const text = query.trim().toLowerCase();
    const matchesText = !text || row.reference.toLowerCase().includes(text) || row.merchantName.toLowerCase().includes(text);
    return matchesText && (status === "ALL" || row.status === status) && (method === "ALL" || row.method === method);
  }), [rows, query, status, method]);

  const stats = React.useMemo(() => ({
    total: rows.length,
    processing: rows.filter((row) => row.status !== "PAID").reduce((sum, row) => sum + row.netAmount, 0),
    paid: rows.filter((row) => row.status === "PAID").reduce((sum, row) => sum + row.netAmount, 0),
    countPaid: rows.filter((row) => row.status === "PAID").length,
  }), [rows]);

  React.useEffect(() => setPage(1), [query, status, method]);
  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const visibleRows = filteredRows.slice((page - 1) * perPage, page * perPage);

  function exportCsv() {
    const header = ["Référence", "Marchand", "COD brut", "Frais", "Net", "Méthode", "Statut", "Date paiement"];
    const lines = filteredRows.map((row) => [row.reference, row.merchantName, row.grossCOD, row.fees, row.netAmount, row.method, row.status, row.paidAt ?? ""]);
    const csv = [header, ...lines].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = "versements.csv"; link.click(); URL.revokeObjectURL(url);
  }

  async function markPaid() {
    if (!paying) return;
    setBusyId(paying.id);
    const res = await markSettlementPaidAction(paying.id, { paymentReference, paymentNote });
    setBusyId(null);
    toast.push({ title: res.ok ? t("settings.saved") : res.message ?? t("common.errorTitle"), variant: res.ok ? "success" : "error" });
    if (res.ok) { setPaying(null); setPaymentReference(""); setPaymentNote(""); router.refresh(); }
  }

  return (
    <>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {[["Total versements", stats.total], ["En traitement", money(stats.processing, { compact: true })], ["Total payé", money(stats.paid, { compact: true })], ["Versements payés", stats.countPaid]].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-border bg-surface p-3 shadow-xs"><p className="text-[11px] uppercase tracking-[0.08em] text-faint">{label}</p><p className="mt-3 text-[22px] font-semibold tracking-[-0.03em] tnum">{value}</p></div>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-xs"><Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher référence ou marchand..." className="ps-8" /></div>
        <Select value={status} onChange={(event) => setStatus(event.target.value)} className="min-w-[135px]"><option value="ALL">Tous statuts</option><option value="PROCESSING">En traitement</option><option value="PAID">Payé</option></Select>
        <Select value={method} onChange={(event) => setMethod(event.target.value)} className="min-w-[145px]">
          <option value="ALL">Toutes méthodes</option>
          <option value="BANK_TRANSFER">Virement bancaire</option>
          <option value="INSTANT_TRANSFER">Virement instantané ⚡</option>
          <option value="CASH">Espèces</option>
          <option value="CHECK">Chèque</option>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="size-3.5" /> Exporter</Button>
      </div>
      <div className="rounded-xl border border-border bg-surface shadow-xs">
      {filteredRows.length === 0 ? (
        <EmptyState icon={Banknote} title={t("admin.settlements.empty")} />
      ) : (
        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>{t("wallet.settlement.ref")}</TH>
              <TH>{t("admin.settlements.table.merchant")}</TH>
              <TH className="hidden text-end md:table-cell">{t("wallet.settlement.gross")}</TH>
              <TH className="hidden text-end md:table-cell">{t("wallet.settlement.fees")}</TH>
              <TH className="text-end">{t("wallet.settlement.net")}</TH>
              <TH className="hidden lg:table-cell">{t("settleMethod.BANK_TRANSFER").split(" ")[0]}</TH>
              <TH className="hidden xl:table-cell">Date</TH>
              <TH>{t("common.status")}</TH>
              <TH className="w-10" />
            </TR>
          </THead>
          <TBody>
            {visibleRows.map((s) => (
              <TR key={s.id}>
                <TD className="font-semibold tnum">{s.reference}</TD>
                <TD className="font-medium">{s.merchantName}</TD>
                <TD className="hidden text-end tnum md:table-cell">{money(s.grossCOD)}</TD>
                <TD className="hidden text-end text-error tnum md:table-cell">− {money(-s.fees)}</TD>
                <TD className="text-end font-semibold tnum">{money(s.netAmount)}</TD>
                <TD className="hidden text-muted-foreground lg:table-cell">{t(`settleMethod.${s.method}`)}</TD>
                <TD className="hidden text-muted-foreground tnum xl:table-cell">{date(s.paidAt ?? s.createdAt)}</TD>
                <TD><StatusBadge status={s.status} size="sm" /></TD>
                <TD>
                  {s.status !== "PAID" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === s.id}
                      onClick={() => setPaying(s)}
                    >
                      <CheckCircle2 className="size-3.5" /> {t("admin.settlements.markPaid")}
                    </Button>
                  )}
                  <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="iconSm" aria-label="Actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setSelected(s)}><Eye className="size-4" /> Voir le détail</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      </div>
      {filteredRows.length > 0 && <div className="mt-2 flex items-center justify-between text-[12px] text-muted-foreground"><span>{(page - 1) * perPage + 1}–{Math.min(page * perPage, filteredRows.length)} sur {filteredRows.length}</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Précédent</Button><span className="tnum">{page} / {totalPages}</span><Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>Suivant</Button></div></div>}
      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><DialogContent size="sm">{selected && <><DialogTitle>{selected.reference}</DialogTitle><DialogDescription>{selected.merchantName}</DialogDescription><dl className="mt-4 space-y-2 text-[13px]"><div className="flex justify-between"><dt className="text-muted-foreground">COD brut</dt><dd className="tnum">{money(selected.grossCOD)}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Frais</dt><dd className="text-error tnum">− {money(selected.fees)}</dd></div><div className="flex justify-between font-semibold"><dt>Net</dt><dd className="tnum">{money(selected.netAmount)}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Référence paiement</dt><dd>{selected.paymentReference ?? "—"}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Payé le</dt><dd>{selected.paidAt ? date(selected.paidAt) : "—"}</dd></div></dl></>}</DialogContent></Dialog>
      <Dialog open={Boolean(paying)} onOpenChange={(open) => !open && setPaying(null)}><DialogContent size="sm">{paying && <><DialogTitle>Confirmer le paiement</DialogTitle><DialogDescription>Confirmez que le montant de {money(paying.netAmount)} a été transféré à {paying.merchantName}.</DialogDescription><div className="mt-4 space-y-3"><Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Référence du virement (optionnel)" /><Textarea value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="Note de paiement (optionnel)" rows={3} /></div><DialogFooter><Button variant="ghost" onClick={() => setPaying(null)}>Annuler</Button><Button disabled={busyId === paying.id} onClick={markPaid}><CheckCircle2 className="size-3.5" /> Confirmer le paiement</Button></DialogFooter></>}</DialogContent></Dialog>
    </>
  );
}
