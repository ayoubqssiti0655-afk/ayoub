import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Printer, ShieldCheck, Receipt, Landmark, ArrowUpRight } from "lucide-react";
import { getMerchantContext } from "@/lib/auth";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { isFeatureEnabled } from "@/server/features";
import { PageHeader, EmptyState } from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export const metadata = {
  title: "Factures Légales de Livraison (TVA 14%)",
};

export default async function InvoicesPage() {
  const ctx = await getMerchantContext();
  if (!ctx) return redirect("/login");

  const isEnabled = await isFeatureEnabled("tax_invoices");
  const i = await getI18n();

  const settlements = await db.settlement.findMany({
    where: { merchantId: ctx.merchant.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Calculate totals
  let totalTtcCentimes = 0;
  settlements.forEach((s) => {
    totalTtcCentimes += Math.abs(s.fees);
  });

  const totalTtcDh = totalTtcCentimes / 100;
  const totalHtDh = Math.round((totalTtcDh / 1.14) * 100) / 100;
  const totalTva14Dh = Math.round((totalTtcDh - totalHtDh) * 100) / 100;

  if (!isEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={i.t("invoices.title")}
          subtitle={i.t("invoices.desc")}
        />
        <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
          <FileText className="mx-auto size-12 text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-[16px] font-bold">Module Facturation TVA désactivé</h3>
          <p className="mt-1 text-[13px] text-muted-foreground max-w-md mx-auto">
            La fonctionnalité d&apos;émission des factures fiscales de prestation avec TVA 14% est actuellement désactivée dans les paramètres de la plateforme.
          </p>
          <div className="mt-4">
            <Link href="/app/wallet" className={buttonVariants({ variant: "outline" })}>
              Accéder au Portefeuille
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={i.t("invoices.title")}
        subtitle={i.t("invoices.desc")}
      />

      {/* Moroccan Tax & VAT Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <span className="text-[12px] font-semibold text-muted-foreground">Total Frais Facturés (TTC)</span>
          <p className="mt-1 text-[22px] font-extrabold text-foreground tnum">
            {i.money(totalTtcCentimes)}
          </p>
          <span className="text-[11px] text-muted-foreground">Prestations de livraison déduites</span>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <span className="text-[12px] font-semibold text-muted-foreground">TVA Récupérable (14%)</span>
          <p className="mt-1 text-[22px] font-extrabold text-primary tnum">
            {totalTva14Dh.toFixed(2)} DH
          </p>
          <span className="text-[11px] text-primary font-medium">Déductible comptablement (Art 99 CGI)</span>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <span className="text-[12px] font-semibold text-muted-foreground">Base Hors Taxe (HT)</span>
          <p className="mt-1 text-[22px] font-extrabold text-foreground tnum">
            {totalHtDh.toFixed(2)} DH
          </p>
          <span className="text-[11px] text-muted-foreground">Charges d&apos;exploitation déductibles</span>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <span className="text-[12px] font-semibold text-muted-foreground">Factures Disponibles</span>
          <p className="mt-1 text-[22px] font-extrabold text-foreground tnum">
            {settlements.length}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Conformes aux normes fiscales marocaines</span>
        </div>
      </div>

      {/* Moroccan CGI notice banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-[12.5px] text-foreground">
        <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-primary">
            Factures conformes aux exigences du Code Général des Impôts (CGI Maroc)
          </p>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Chaque versement donne lieu à une facture officielle de prestation de transport avec TVA à 14% (Art. 99-2° CGI), portant les mentions obligatoires (ICE, IF, RC, Patente). Vos factures sont immédiatement compensées sur vos encaissements COD et prêtes pour votre expert-comptable.
          </p>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
        {settlements.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={i.t("invoices.empty")}
          />
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>N° Facture</TH>
                <TH className="hidden sm:table-cell">Date d&apos;émission</TH>
                <TH className="hidden md:table-cell">Réf. Versement COD</TH>
                <TH className="text-end hidden lg:table-cell">Montant HT</TH>
                <TH className="text-end hidden sm:table-cell">TVA (14%)</TH>
                <TH className="text-end">Total TTC</TH>
                <TH>Statut</TH>
                <TH className="text-end">Action</TH>
              </TR>
            </THead>
            <TBody>
              {settlements.map((s) => {
                const ttcDh = Math.abs(s.fees) / 100;
                const htDh = Math.round((ttcDh / 1.14) * 100) / 100;
                const tvaDh = Math.round((ttcDh - htDh) * 100) / 100;
                const factRef = `FACT-${s.reference.replace(/^STL-/, "")}`;

                return (
                  <TR key={s.id}>
                    <TD className="font-bold font-mono text-primary text-[13px]">
                      {factRef}
                    </TD>
                    <TD className="hidden sm:table-cell text-muted-foreground text-[12px] tnum">
                      {i.date(s.paidAt || s.createdAt)}
                    </TD>
                    <TD className="hidden md:table-cell font-mono text-[12px] text-muted-foreground">
                      {s.reference}
                    </TD>
                    <TD className="text-end font-mono text-[12.5px] hidden lg:table-cell">
                      {htDh.toFixed(2)} DH
                    </TD>
                    <TD className="text-end font-mono text-[12.5px] font-semibold text-primary hidden sm:table-cell">
                      {tvaDh.toFixed(2)} DH
                    </TD>
                    <TD className="text-end font-mono text-[13px] font-bold text-foreground">
                      {ttcDh.toFixed(2)} DH
                    </TD>
                    <TD>
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Acquittée
                      </span>
                    </TD>
                    <TD className="text-end">
                      <Link
                        href={`/app/invoices/${s.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm", className: "h-8 gap-1 text-[11.5px]" })}
                      >
                        <Printer className="size-3.5" />
                        <span>Imprimer (PDF)</span>
                      </Link>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  );
}

