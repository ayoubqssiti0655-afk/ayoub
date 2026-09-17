"use client";

import * as React from "react";
import Link from "next/link";
import { Printer, ChevronLeft, FileText, CheckCircle2, Building2, Calendar, CreditCard, ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";

export type TaxInvoiceSettlement = {
  id: string;
  reference: string;
  grossCOD: number;
  fees: number;
  netAmount: number;
  status: string;
  method?: string | null;
  paymentReference?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  createdAt: string;
  paidAt?: string | null;
};

export type TaxInvoiceMerchant = {
  id?: string;
  name: string;
  legalName?: string | null;
  phone: string;
  email: string;
  city?: string | null;
  address?: string | null;
  slug?: string;
};

// Convert number to French words for Moroccan legal invoice requirements
function numberToFrenchWords(n: number): string {
  if (n <= 0) return "Zéro Dirham";
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingts", "quatre-vingt-dix"];

  function convertHundreds(num: number): string {
    let res = "";
    if (num >= 100) {
      const h = Math.floor(num / 100);
      if (h === 1) res += "cent";
      else res += units[h] + " cent";
      num %= 100;
      if (num > 0) res += " ";
    }
    if (num >= 10 && num < 20) {
      res += teens[num - 10];
    } else if (num >= 20) {
      const t = Math.floor(num / 10);
      const u = num % 10;
      if (t === 7) {
        res += "soixante-" + teens[u];
      } else if (t === 9) {
        res += "quatre-vingt-" + teens[u];
      } else {
        res += tens[t];
        if (u === 1 && t !== 8) res += " et un";
        else if (u > 0) res += "-" + units[u];
      }
    } else if (num > 0) {
      res += units[num];
    }
    return res;
  }

  function convertGroup(num: number): string {
    if (num === 0) return "";
    if (num >= 1000000) {
      const m = Math.floor(num / 1000000);
      const rem = num % 1000000;
      return (m === 1 ? "un million" : convertHundreds(m) + " millions") + (rem > 0 ? " " + convertGroup(rem) : "");
    }
    if (num >= 1000) {
      const k = Math.floor(num / 1000);
      const rem = num % 1000;
      return (k === 1 ? "mille" : convertHundreds(k) + " mille") + (rem > 0 ? " " + convertHundreds(rem) : "");
    }
    return convertHundreds(num);
  }

  const dh = Math.floor(n);
  const cents = Math.round((n - dh) * 100);
  let words = convertGroup(dh) || "zéro";
  words = words.charAt(0).toUpperCase() + words.slice(1) + " Dirhams";
  if (cents > 0) {
    words += " et " + convertHundreds(cents) + " Centimes";
  } else {
    words += " et zéro Centimes";
  }
  return words;
}

export function PrintableTaxInvoice({
  settlement,
  merchant,
  backHref = "/app/wallet",
}: {
  settlement: TaxInvoiceSettlement;
  merchant: TaxInvoiceMerchant;
  backHref?: string;
}) {
  const { money, date } = useI18n();

  // VAT 14% Calculations (Art 99-2 du CGI pour les prestations de transport)
  const totalTtcDh = Math.abs(settlement.fees) / 100;
  const subtotalHtDh = Math.round((totalTtcDh / 1.14) * 100) / 100;
  const tva14Dh = Math.round((totalTtcDh - subtotalHtDh) * 100) / 100;

  const invoiceNumber = `FACT-${settlement.reference.replace(/^STL-/, "")}`;
  const invoiceDate = settlement.paidAt || settlement.createdAt;
  const wordsInFrench = numberToFrenchWords(totalTtcDh);

  return (
    <div className="mx-auto max-w-4xl py-4 font-sans text-gray-900">
      {/* Action Toolbar */}
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-xs print:hidden">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
          <span>Retour</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button onClick={() => window.print()} className="font-semibold shadow-sm">
            <Printer className="size-4" />
            <span>Imprimer la facture fiscale (PDF)</span>
          </Button>
        </div>
      </div>

      {/* Official Moroccan Tax Invoice A4 Sheet */}
      <div className="tax-invoice-sheet rounded-2xl border-2 border-gray-900 bg-white p-8 shadow-sm print:rounded-none print:border-none print:p-0">
        {/* Top Header */}
        <div className="flex items-start justify-between border-b-2 border-gray-900 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="size-6 text-primary" />
              <span className="text-[20px] font-black tracking-tight uppercase">MASAR LOGISTICS SARL</span>
            </div>
            <p className="text-[11px] font-semibold text-gray-600">
              Société à Responsabilité Limitée d&apos;Exploitation et Messagerie E-commerce
            </p>
            <p className="text-[10.5px] text-gray-500">
              Capital Social: 100.000,00 DH • 124 Boulevard d&apos;Anfa, 5ème étage, Casablanca
            </p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] font-mono text-gray-700">
              <span><strong>ICE:</strong> 002847591000034</span>
              <span><strong>IF:</strong> 49832105</span>
              <span><strong>RC:</strong> Casablanca 512498</span>
              <span><strong>Patente:</strong> 36582104</span>
              <span><strong>CNSS:</strong> 9284152</span>
            </div>
          </div>

          <div className="text-end">
            <div className="inline-block rounded-xl border-2 border-primary bg-primary/5 px-4 py-2 text-center">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-primary">FACTURE FISCALE</span>
              <span className="block font-mono text-[16px] font-black text-gray-900">{invoiceNumber}</span>
              <span className="block text-[10px] font-medium text-emerald-700">✓ ACQUITTÉE / PAYÉE</span>
            </div>
            <p className="mt-2 text-[11.5px] text-gray-600">
              Casablanca, le <strong className="text-gray-900">{date(invoiceDate)}</strong>
            </p>
          </div>
        </div>

        {/* Invoice Summary & Parties */}
        <div className="mt-6 grid grid-cols-2 gap-6">
          {/* Client / Marchand */}
          <div className="rounded-xl border border-gray-300 bg-gray-50/50 p-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">DOIT (CLIENT MARCHAND) :</p>
            <p className="mt-1 text-[15px] font-bold text-gray-900">{merchant.legalName || merchant.name}</p>
            {merchant.address && <p className="mt-0.5 text-[12px] text-gray-600">{merchant.address}</p>}
            <p className="text-[12px] text-gray-600">{merchant.city || "Maroc"}</p>
            <div className="mt-2 space-y-0.5 text-[11.5px] text-gray-600">
              <p>Tél: <span className="font-mono">{merchant.phone}</span></p>
              <p>Email: <span>{merchant.email}</span></p>
            </div>
          </div>

          {/* Facturation details */}
          <div className="rounded-xl border border-gray-300 bg-gray-50/50 p-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">INFORMATIONS DE RÈGLEMENT :</p>
            <div className="mt-2 space-y-1.5 text-[12px]">
              <div className="flex justify-between">
                <span className="text-gray-600">Réf. Versement COD :</span>
                <span className="font-mono font-bold text-gray-900">{settlement.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mode de paiement :</span>
                <span className="font-medium text-gray-900">Compensation sur encaissement COD</span>
              </div>
              {settlement.paymentReference && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Virement bancaire N° :</span>
                  <span className="font-mono font-bold text-primary">{settlement.paymentReference}</span>
                </div>
              )}
              {settlement.periodStart && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Période d&apos;exécution :</span>
                  <span className="text-gray-800">
                    {date(settlement.periodStart)} → {date(settlement.periodEnd || settlement.createdAt)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Lines Table */}
        <div className="mt-6 overflow-hidden rounded-xl border-2 border-gray-900">
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-b-2 border-gray-900 bg-gray-100 text-[11px] font-black uppercase text-gray-900">
              <tr>
                <th className="p-3">Désignation de la prestation de service</th>
                <th className="p-3 text-center">Qté</th>
                <th className="p-3 text-end">Montant HT (DH)</th>
                <th className="p-3 text-center">Taux TVA</th>
                <th className="p-3 text-end">Montant TVA (DH)</th>
                <th className="p-3 text-end">Total TTC (DH)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="p-3 font-medium text-gray-900">
                  Prestation de messagerie, expédition et livraison e-commerce (COD)
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    Frais de livraison et retours déduits du bordereau de versement N° {settlement.reference}
                  </p>
                </td>
                <td className="p-3 text-center font-mono">1</td>
                <td className="p-3 text-end font-mono font-semibold">{subtotalHtDh.toFixed(2)}</td>
                <td className="p-3 text-center font-mono font-bold text-primary">14.00%</td>
                <td className="p-3 text-end font-mono font-semibold">{tva14Dh.toFixed(2)}</td>
                <td className="p-3 text-end font-mono font-bold text-gray-900">{totalTtcDh.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown */}
        <div className="mt-6 flex justify-end">
          <div className="w-80 rounded-xl border-2 border-gray-900 bg-gray-50 p-4 space-y-2">
            <div className="flex justify-between text-[12.5px]">
              <span className="text-gray-600">Total Hors Taxes (HT) :</span>
              <span className="font-mono font-semibold">{subtotalHtDh.toFixed(2)} DH</span>
            </div>
            <div className="flex justify-between text-[12.5px]">
              <span className="text-gray-600">TVA Transport (14%) :</span>
              <span className="font-mono font-semibold text-primary">{tva14Dh.toFixed(2)} DH</span>
            </div>
            <div className="border-t-2 border-gray-900 pt-2 flex justify-between text-[14.5px] font-black text-gray-900">
              <span>TOTAL TTC :</span>
              <span className="font-mono">{totalTtcDh.toFixed(2)} DH</span>
            </div>
            <div className="flex justify-between text-[12px] text-emerald-700 font-medium">
              <span>Déduit sur versement COD :</span>
              <span className="font-mono">− {totalTtcDh.toFixed(2)} DH</span>
            </div>
            <div className="border-t border-gray-300 pt-1.5 flex justify-between text-[13px] font-bold text-emerald-800">
              <span>NET À PAYER :</span>
              <span className="font-mono">0,00 DH (ACQUITTÉE)</span>
            </div>
          </div>
        </div>

        {/* Legal Mentions */}
        <div className="mt-6 rounded-xl border border-gray-300 bg-gray-50/70 p-4 text-[11.5px] text-gray-700 space-y-2">
          <p>
            <strong>Arrêtée la présente facture à la somme TTC de :</strong>{" "}
            <span className="font-semibold italic text-gray-900">{wordsInFrench}.</span>
          </p>
          <p className="text-[10.5px] text-gray-500">
            • Prestations de transport et livraison de colis e-commerce soumises au taux de TVA de 14% avec droit à déduction conformément à l&apos;article 99-2° du Code Général des Impôts (CGI) marocain.
          </p>
          <p className="text-[10.5px] text-gray-500">
            • Facture acquittée intégralement par compensation directe sur les fonds collectés en contre-remboursement (Bordereau de versement N° {settlement.reference}).
          </p>
        </div>

        {/* Signature & Stamp Boxes */}
        <div className="mt-8 grid grid-cols-2 gap-8 text-center text-[12px]">
          <div className="rounded-xl border border-dashed border-gray-400 p-4">
            <p className="font-bold text-gray-700 uppercase">Pour le Client (Marchand)</p>
            <p className="text-[10px] text-gray-500">Accusé de réception & Comptabilité</p>
            <div className="h-20" />
          </div>
          <div className="rounded-xl border-2 border-gray-900 p-4 bg-emerald-50/40 relative">
            <p className="font-bold text-gray-900 uppercase">Pour MASAR LOGISTICS SARL</p>
            <p className="text-[10px] text-gray-500">Direction Financière & Comptable</p>
            <div className="my-2 inline-block rounded-md border-2 border-emerald-600 px-3 py-1 font-mono text-[13px] font-black text-emerald-700 rotate-[-4deg]">
              ✓ FACTURE ACQUITTÉE
            </div>
            <p className="text-[9.5px] text-gray-500">Document généré électroniquement conforme à la loi 53-05</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-gray-300 pt-3 text-center text-[10px] text-gray-500">
          MASAR LOGISTICS SARL • Siège social: 124 Bd d&apos;Anfa, Casablanca • ICE 002847591000034 • IF 49832105 • RC 512498 • Patente 36582104 • CNSS 9284152
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          nav, header, footer, aside, .print\\:hidden {
            display: none !important;
          }
          .tax-invoice-sheet {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

