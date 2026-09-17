import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/server/db";
import { getMerchantContext } from "@/lib/auth";
import { getI18n } from "@/i18n/server";
import { Logo } from "@/components/logo";
import { PrintButton } from "@/components/merchant/print-button";

export const metadata = { title: "Parcel label" };

export default async function OrderLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getMerchantContext();
  if (!ctx) return null;
  const i = await getI18n();

  const order = await db.order.findFirst({
    where: { id, merchantId: ctx.merchant.id },
    include: { customer: true, merchant: true },
  });
  if (!order) notFound();

  const qr = await QRCode.toDataURL(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3311"}/track?ref=${order.reference}`, {
    margin: 0, width: 300, color: { dark: "#111827", light: "#ffffff" },
  });

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/app/orders/${order.id}`} className="text-[12.5px] text-muted-foreground hover:text-foreground">← {i.t("common.back")}</Link>
        <PrintButton label={i.t("label.print")} />
      </div>

      <div className="label-sheet overflow-hidden rounded-2xl border-2 border-foreground bg-white text-[#111827]">
        <div className="flex items-center justify-between border-b-2 border-foreground px-5 py-3">
          <Logo mark />
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em]">{order.merchant.name}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6b7280]">{i.t("label.to")}</p>
            <p className="mt-1 text-[19px] font-bold leading-tight">{order.customer.fullName}</p>
            <p className="mt-1 text-[13.5px] font-medium leading-5" dir="ltr">{i.phone(order.customer.phone)}</p>
            <p className="mt-1.5 text-[13px] leading-5">{order.deliveryAddress}</p>
            <p className="text-[13px] font-semibold">{order.deliveryCity}{order.postalCode ? ` ${order.postalCode}` : ""}</p>
            {order.notes && <p className="mt-1.5 inline-block rounded bg-[#fef3c7] px-2 py-0.5 text-[11.5px] font-medium">{order.notes}</p>}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR ${order.reference}`} className="size-28 shrink-0" />
        </div>

        <div className="border-t-2 border-dashed border-[#d1d5db] px-5 py-3">
          <p className="text-center text-[26px] font-bold tracking-[0.18em] tnum" dir="ltr">{order.reference}</p>
        </div>

        <div className={`flex items-center justify-between border-t-2 border-foreground px-5 py-3 ${order.codAmount > 0 ? "bg-[#dcfce7]" : "bg-[#e0e7ff]"}`}>
          {order.codAmount > 0 ? (
            <>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">{i.t("label.cod")}</span>
              <span className="text-[22px] font-bold tnum">{i.money(order.codAmount)}</span>
            </>
          ) : (
            <span className="w-full text-center text-[14px] font-bold uppercase tracking-[0.06em]">{i.t("label.prepaid")}</span>
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-[11.5px] text-faint print:hidden">{i.t("label.title")} — {order.reference}</p>

      <style>{`
        @media print {
          body { background: #fff !important; }
          header, aside, nav, .print\\:hidden { display: none !important; }
          .label-sheet { border-width: 2px !important; border-radius: 0 !important; }
          main { padding: 0 !important; max-width: none !important; }
        }
      `}</style>
    </div>
  );
}
