"use client";

import * as React from "react";
import Link from "next/link";
import { Printer, ChevronLeft, FileCheck, RotateCcw, Building2, Phone, MapPin, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export type ManifestItem = {
  id: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  city: string;
  codAmount: number;
  status: string;
  returnReason?: string | null;
};

export function PrintableManifest({
  type = "RAMASSAGE",
  reference,
  merchant,
  items,
  courierName,
  createdAt,
  backHref = "/app/orders",
}: {
  type: "RAMASSAGE" | "RETOUR";
  reference: string;
  merchant: {
    name: string;
    phone: string;
    city?: string | null;
    address?: string | null;
  };
  items: ManifestItem[];
  courierName?: string | null;
  createdAt?: string;
  backHref?: string;
}) {
  const { money, phone } = useI18n();

  const totalCod = items.reduce((acc, it) => acc + it.codAmount, 0);
  const isPickup = type === "RAMASSAGE";
  const title = isPickup
    ? "BORDEREAU DE RAMASSAGE DES COLIS"
    : "BORDEREAU DE RESTITUTION DES RETOURS";
  const titleAr = isPickup
    ? "ورقة استلام إرساليات الشحن (الراماساج)"
    : "بوليصة استلام الطرود المرتجعة للتاجر";

  const dateStr = createdAt
    ? new Date(createdAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })
    : new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

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
            <span>Imprimer le bordereau (PDF)</span>
          </Button>
        </div>
      </div>

      {/* Official A4 Sheet */}
      <div className="manifest-sheet rounded-2xl border-2 border-gray-900 bg-white p-8 shadow-sm print:rounded-none print:border-none print:p-0">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-gray-900 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {isPickup ? (
                <FileCheck className="size-6 text-primary" />
              ) : (
                <RotateCcw className="size-6 text-amber-600" />
              )}
              <span className="text-[20px] font-black tracking-tight uppercase">MASAR LOGISTICS</span>
            </div>
            <p className="text-[14px] font-black text-gray-900 uppercase tracking-wide">
              {title}
            </p>
            <p className="text-[12px] font-bold text-gray-600" dir="rtl">
              {titleAr}
            </p>
          </div>

          <div className="text-right space-y-1">
            <div className="inline-block rounded border-2 border-gray-900 bg-gray-900 px-3 py-1 text-white">
              <span className="text-[11px] font-bold block uppercase tracking-wider">N° BORDEREAU</span>
              <span className="text-[16px] font-black tracking-wider" dir="ltr">{reference}</span>
            </div>
            <p className="text-[11px] font-bold text-gray-600">Date: {dateStr}</p>
          </div>
        </div>

        {/* Merchant & Transporter Info Box */}
        <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-gray-300 bg-gray-50/70 p-4 text-[12.5px]">
          <div>
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">EXPÉDITEUR / MARCHAND</span>
            <p className="text-[14px] font-black text-gray-900 mt-0.5">{merchant.name}</p>
            <p className="text-[12px] font-bold text-gray-700 mt-0.5" dir="ltr">{phone(merchant.phone)}</p>
            {merchant.address && <p className="text-[11.5px] text-gray-600 mt-0.5">{merchant.address}, {merchant.city || "Maroc"}</p>}
          </div>

          <div>
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">LIVREUR / HUB CHARGÉ</span>
            <p className="text-[14px] font-black text-gray-900 mt-0.5">{courierName || "Agent de tournée / Hub Masar"}</p>
            <p className="text-[11.5px] text-gray-600 mt-0.5">Statut: Prise en charge officielle validée</p>
            <p className="text-[11.5px] text-gray-600 mt-0.5">Mode: {isPickup ? "Ramassage Standard" : "Restitution Retour Marchand"}</p>
          </div>
        </div>

        {/* Summary Indicators */}
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-gray-300 p-3 bg-white">
            <span className="text-[10.5px] font-extrabold uppercase text-gray-500">NOMBRE TOTAL DE COLIS</span>
            <p className="text-[22px] font-black text-gray-900 mt-0.5">{items.length} Colis</p>
          </div>
          <div className="rounded-xl border border-gray-300 p-3 bg-white">
            <span className="text-[10.5px] font-extrabold uppercase text-gray-500">VALEUR GLOBALE COD</span>
            <p className="text-[22px] font-black text-emerald-700 mt-0.5">{money(totalCod)}</p>
          </div>
          <div className="rounded-xl border border-gray-300 p-3 bg-white">
            <span className="text-[10.5px] font-extrabold uppercase text-gray-500">TYPE D&apos;OPÉRATION</span>
            <p className="text-[16px] font-black text-gray-800 mt-1 uppercase">{isPickup ? "Ramassage" : "Retour"}</p>
          </div>
        </div>

        {/* Parcels Table */}
        <div className="mt-5 overflow-hidden rounded-xl border-2 border-gray-900">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead className="bg-gray-900 text-white font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Réf. Colis (Tracking)</th>
                <th className="py-2.5 px-3">Destinataire & Tél</th>
                <th className="py-2.5 px-3">Ville de destination</th>
                <th className="py-2.5 px-3 text-right">Montant COD</th>
                {isPickup ? (
                  <th className="py-2.5 px-3 text-center w-24">Vérification</th>
                ) : (
                  <th className="py-2.5 px-3">Motif du retour</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((it, idx) => (
                <tr key={it.id} className={idx % 2 === 1 ? "bg-gray-50/70" : "bg-white"}>
                  <td className="py-2.5 px-3 text-center font-bold text-gray-500">{idx + 1}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-black text-gray-900 tracking-wider" dir="ltr">{it.reference}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="font-bold text-gray-900 leading-tight">{it.customerName}</p>
                    <p className="text-[11px] text-gray-600 font-medium" dir="ltr">{phone(it.customerPhone)}</p>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-gray-800">{it.city}</td>
                  <td className="py-2.5 px-3 text-right font-black text-gray-900 tnum">
                    {it.codAmount > 0 ? money(it.codAmount) : "Payé"}
                  </td>
                  {isPickup ? (
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block size-4 rounded border border-gray-400"></span>
                    </td>
                  ) : (
                    <td className="py-2.5 px-3 text-[11px] font-semibold text-amber-800">
                      {it.returnReason || "Non livré / Refusé"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-900 bg-gray-100 font-bold">
              <tr>
                <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wide">
                  Total des colis ({items.length}) :
                </td>
                <td className="py-2.5 px-3 text-right font-black text-[14px] text-gray-900 tnum">
                  {money(totalCod)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legal Signatures Section */}
        <div className="mt-8 grid grid-cols-2 gap-6 pt-4">
          <div className="h-36 rounded-xl border-2 border-dashed border-gray-400 p-3.5 flex flex-col justify-between bg-gray-50/30">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-700">
              Signature & Cachet de l&apos;Expéditeur (التاجر)
            </span>
            <p className="text-[10px] text-gray-400 italic text-center">
              Je certifie avoir remis les colis décrits ci-dessus en bon état.
            </p>
          </div>

          <div className="h-36 rounded-xl border-2 border-dashed border-gray-400 p-3.5 flex flex-col justify-between bg-gray-50/30">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-700">
              Signature & Cachet du Transporteur (الموزع / الوكالة)
            </span>
            <p className="text-[10px] text-gray-400 italic text-center">
              Prise en charge validée sous réserve de contrôle physique au Hub.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 border-t border-gray-200 pt-3 flex items-center justify-between text-[10px] font-semibold text-gray-500">
          <span>Ce document fait foi légale de prise en charge ou de restitution des marchandises.</span>
          <span>Masar Logistics Systems • www.masar.ma</span>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          header, aside, nav, .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
          }
          .manifest-sheet {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

