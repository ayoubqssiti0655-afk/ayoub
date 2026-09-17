"use client";

import * as React from "react";
import Link from "next/link";
import { Printer, FileText, Check, ChevronLeft, PackageCheck } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export type PrintableOrderLabel = {
  id: string;
  reference: string;
  merchantName: string;
  merchantPhone?: string | null;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  postalCode?: string | null;
  notes?: string | null;
  internalNote?: string | null;
  codAmount: number;
  qr: string;
  allowOpenParcel?: boolean;
};

export function ShippingLabelView({
  orders,
  backHref = "/app/orders",
  thermalEnabled = true,
}: {
  orders: PrintableOrderLabel[];
  backHref?: string;
  thermalEnabled?: boolean;
}) {
  const { t, money, phone } = useI18n();
  const [format, setFormat] = React.useState<"standard" | "thermal">("thermal");

  // City code helper (e.g. CAS, RAB, RAK, FES, TNG, AGD)
  function getCityCode(city: string) {
    const c = city.trim().toUpperCase();
    if (c.includes("CASA")) return "CAS";
    if (c.includes("RABAT")) return "RAB";
    if (c.includes("MARRA")) return "RAK";
    if (c.includes("FES") || c.includes("FÈS")) return "FES";
    if (c.includes("TANG") || c.includes("TANGER")) return "TNG";
    if (c.includes("AGAD")) return "AGD";
    if (c.includes("MEKN")) return "MEK";
    if (c.includes("OUJD")) return "OUJ";
    if (c.includes("KENI")) return "KEN";
    if (c.includes("TETO")) return "TET";
    return c.slice(0, 3);
  }

  return (
    <div className={`mx-auto ${format === "thermal" ? "max-w-[105mm]" : "max-w-lg"} py-3`}>
      {/* Control Toolbar - Hidden when printing */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-xs print:hidden">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
          <span>{t("common.back")}</span>
        </Link>

        {/* Format Selector: Standard A4 vs Thermal 10x15cm */}
        {thermalEnabled && (
          <div className="inline-flex items-center rounded-xl border border-border bg-surface-2 p-1 text-[12px]">
            <button
              type="button"
              onClick={() => setFormat("thermal")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium transition-all ${
                format === "thermal"
                  ? "bg-primary text-white shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Printer className="size-3.5" />
              <span>Format Thermique A6 (10x15)</span>
            </button>
            <button
              type="button"
              onClick={() => setFormat("standard")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium transition-all ${
                format === "standard"
                  ? "bg-primary text-white shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="size-3.5" />
              <span>Format Standard A4</span>
            </button>
          </div>
        )}

        <Button
          onClick={() => window.print()}
          className="shadow-sm font-semibold"
          size="sm"
        >
          <Printer className="size-4" />
          <span>{t("label.print") || "Imprimer les étiquettes"}</span>
        </Button>
      </div>

      {/* Printable Area */}
      <div className={format === "thermal" ? "thermal-container" : "standard-container space-y-6 print:space-y-0"}>
        {orders.map((order, idx) => {
          const isAllowOpen =
            order.allowOpenParcel ||
            order.notes?.includes("[OUVRIR_COLIS]") ||
            order.internalNote?.includes("[OUVRIR_COLIS]");
          const cleanNotes = order.notes?.replace(/\[OUVRIR_COLIS\]/g, "").trim();
          const cityCode = getCityCode(order.deliveryCity);

          if (format === "thermal") {
            return (
              <div
                key={order.id}
                className="thermal-label relative flex flex-col justify-between overflow-hidden bg-white text-black print:page-break-after"
                style={{
                  width: "100mm",
                  height: "150mm",
                  padding: "6mm",
                  boxSizing: "border-box",
                  border: "2px solid #000",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {/* Header: Carrier brand & City Code */}
                <div>
                  <div className="flex items-center justify-between border-b-2 border-black pb-2">
                    <div>
                      <span className="text-[14px] font-black uppercase tracking-wider">MASAR EXPRESS</span>
                      <p className="text-[10px] font-bold text-gray-700 uppercase">{order.merchantName}</p>
                    </div>
                    <div className="rounded border-2 border-black bg-black px-2.5 py-1 text-center text-white">
                      <span className="block text-[9px] font-bold tracking-widest leading-none">DESTINATION</span>
                      <span className="text-[18px] font-black leading-none">{cityCode}</span>
                    </div>
                  </div>

                  {/* Tracking reference & Barcode simulation */}
                  <div className="mt-2 text-center border-b-2 border-dashed border-gray-400 pb-2">
                    <p className="text-[22px] font-black tracking-[0.2em] leading-none" dir="ltr">
                      {order.reference}
                    </p>
                    {/* Visual Barcode bars */}
                    <div className="mt-1 flex items-center justify-center gap-[2px] h-8 overflow-hidden opacity-90">
                      {[1,3,1,2,4,1,3,2,1,4,2,3,1,2,1,4,3,2,1,3,2,4,1,2,3,1,4,2,1,3,2,4,1,2].map((w, i) => (
                        <div key={i} className="bg-black h-full" style={{ width: `${w * 1.5}px` }} />
                      ))}
                    </div>
                  </div>

                  {/* Recipient Information & QR */}
                  <div className="mt-2.5 grid grid-cols-[1fr_auto] gap-2 border-b-2 border-black pb-2">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase text-gray-600">DESTINATAIRE</span>
                      <p className="text-[16px] font-black leading-tight">{order.customerName}</p>
                      <p className="text-[15px] font-black text-black leading-tight mt-0.5" dir="ltr">
                        {phone(order.customerPhone)}
                      </p>
                      <p className="text-[12px] font-semibold leading-snug text-gray-900 mt-1">
                        {order.deliveryAddress}
                      </p>
                      <p className="text-[14px] font-black uppercase text-black mt-0.5">
                        {order.deliveryCity}
                      </p>
                      {cleanNotes && (
                        <div className="mt-1 rounded border border-black/40 bg-gray-100 p-1 text-[11px] font-bold">
                          NOTE: {cleanNotes}
                        </div>
                      )}
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={order.qr} alt={`QR ${order.reference}`} className="size-24 self-start border border-black p-0.5" />
                  </div>
                </div>

                {/* Bottom Section: Allow Open Inspection Badge & COD Amount */}
                <div className="space-y-1.5">
                  {/* Moroccan Open Box Inspection Badge */}
                  <div
                    className={`rounded border-2 px-2 py-1 text-center font-black ${
                      isAllowOpen
                        ? "border-black bg-gray-100 text-black text-[11px]"
                        : "border-black bg-black text-white text-[10.5px]"
                    }`}
                  >
                    {isAllowOpen ? (
                      <span className="inline-flex items-center gap-1">
                        [✓] OUVERTURE AUTORISÉE (معاينة قبل الأداء)
                      </span>
                    ) : (
                      <span>[✗] NE PAS OUVRIR AVANT PAIEMENT</span>
                    )}
                  </div>

                  {/* Big Bold COD Amount */}
                  <div className="flex items-center justify-between rounded border-2 border-black bg-black px-3 py-2 text-white">
                    <span className="text-[12px] font-black tracking-widest uppercase">
                      {order.codAmount > 0 ? "MONTANT COD / الكاش" : "PAYÉ D'AVANCE"}
                    </span>
                    <span className="text-[26px] font-black tracking-tight leading-none tnum">
                      {order.codAmount > 0 ? `${(order.codAmount / 100).toFixed(0)} DH` : "0 DH"}
                    </span>
                  </div>

                  <div className="flex justify-between text-[8.5px] font-bold text-gray-500 pt-0.5">
                    <span>Date: {new Date().toLocaleDateString("fr-FR")}</span>
                    <span>Masar Delivery OS • Maroc</span>
                  </div>
                </div>
              </div>
            );
          }

          // Standard A4 Format
          return (
            <div
              key={order.id}
              className="label-sheet overflow-hidden rounded-2xl border-2 border-foreground bg-white text-[#111827] print:rounded-none print:border-2"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-foreground px-5 py-3">
                <Logo mark />
                <span className="text-[12px] font-semibold uppercase tracking-[0.08em]">
                  {order.merchantName}
                </span>
              </div>

              {/* Recipient & QR */}
              <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6b7280]">
                    {t("label.to")}
                  </p>
                  <p className="mt-1 text-[19px] font-bold leading-tight">
                    {order.customerName}
                  </p>
                  <p className="mt-1 text-[13.5px] font-medium leading-5" dir="ltr">
                    {phone(order.customerPhone)}
                  </p>
                  <p className="mt-1.5 text-[13px] leading-5">{order.deliveryAddress}</p>
                  <p className="text-[13px] font-semibold">
                    {order.deliveryCity}
                    {order.postalCode ? ` ${order.postalCode}` : ""}
                  </p>
                  {cleanNotes && (
                    <p className="mt-1.5 inline-block rounded bg-[#fef3c7] px-2 py-0.5 text-[11.5px] font-medium">
                      {cleanNotes}
                    </p>
                  )}
                  {/* Allow Open Badge in Standard */}
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        isAllowOpen
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-gray-100 text-gray-700 border border-gray-300"
                      }`}
                    >
                      {isAllowOpen ? "✓ Ouverture autorisée au client" : "✗ Ne pas ouvrir avant paiement"}
                    </span>
                  </div>
                </div>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={order.qr}
                  alt={`QR ${order.reference}`}
                  className="size-28 shrink-0"
                />
              </div>

              {/* Reference */}
              <div className="border-t-2 border-dashed border-[#d1d5db] px-5 py-3">
                <p className="text-center text-[26px] font-bold tracking-[0.18em] tnum" dir="ltr">
                  {order.reference}
                </p>
              </div>

              {/* COD banner */}
              <div
                className={`flex items-center justify-between border-t-2 border-foreground px-5 py-3 ${
                  order.codAmount > 0 ? "bg-[#dcfce7]" : "bg-[#e0e7ff]"
                }`}
              >
                {order.codAmount > 0 ? (
                  <>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">
                      {t("label.cod")}
                    </span>
                    <span className="text-[22px] font-bold tnum">
                      {money(order.codAmount)}
                    </span>
                  </>
                ) : (
                  <span className="w-full text-center text-[14px] font-bold uppercase tracking-[0.06em]">
                    {t("label.prepaid")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          header, aside, nav, .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
          }
          .thermal-label {
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 auto !important;
          }
          @page {
            size: ${format === "thermal" ? "100mm 150mm" : "auto"};
            margin: ${format === "thermal" ? "0" : "10mm"};
          }
        }
      `}</style>
    </div>
  );
}

