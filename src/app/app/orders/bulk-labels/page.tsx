import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/server/db";
import { getMerchantContext } from "@/lib/auth";
import { getI18n } from "@/i18n/server";
import { Logo } from "@/components/logo";
import { PrintButton } from "@/components/merchant/print-button";

export const metadata = { title: "A6 Shipping Labels" };

export default async function BulkLabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids: idsParam } = await searchParams;
  const ctx = await getMerchantContext();
  if (!ctx) redirect("/login");
  const i = await getI18n();

  const ids = (idsParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) notFound();

  const orders = await db.order.findMany({
    where: {
      id: { in: ids },
      merchantId: ctx.merchant.id,
    },
    include: { customer: true, merchant: true },
  });

  if (orders.length === 0) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const ordersWithQr = await Promise.all(
    orders.map(async (order) => {
      const qr = await QRCode.toDataURL(`${appUrl}/track?ref=${order.reference}`, {
        margin: 0,
        width: 300,
        color: { dark: "#111827", light: "#ffffff" },
      });
      return { ...order, qr };
    })
  );

  return (
    <div className="mx-auto max-w-lg py-4">
      {/* Top action bar - hidden when printing */}
      <div className="mb-6 flex items-center justify-between rounded-xl border border-border bg-surface p-4 shadow-xs print:hidden">
        <div>
          <Link
            href="/app/orders"
            className="text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            ← {i.t("label.backToOrders")}
          </Link>
          <h1 className="mt-1 text-[16px] font-semibold">
            {i.t("label.bulkTitle")} ({orders.length})
          </h1>
        </div>
        <PrintButton label={i.t("label.bulkPrintAll")} />
      </div>

      {/* Printable labels container */}
      <div className="space-y-6 print:space-y-0">
        {ordersWithQr.map((order, idx) => (
          <div
            key={order.id}
            className="label-sheet overflow-hidden rounded-2xl border-2 border-foreground bg-white text-[#111827] print:rounded-none print:border-2"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-foreground px-5 py-3">
              <Logo mark />
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em]">
                {order.merchant.name}
              </span>
            </div>

            {/* Recipient & QR */}
            <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6b7280]">
                  {i.t("label.to")}
                </p>
                <p className="mt-1 text-[19px] font-bold leading-tight">
                  {order.customer.fullName}
                </p>
                <p className="mt-1 text-[13.5px] font-medium leading-5" dir="ltr">
                  {i.phone(order.customer.phone)}
                </p>
                <p className="mt-1.5 text-[13px] leading-5">{order.deliveryAddress}</p>
                <p className="text-[13px] font-semibold">
                  {order.deliveryCity}
                  {order.postalCode ? ` ${order.postalCode}` : ""}
                </p>
                {order.notes && (
                  <p className="mt-1.5 inline-block rounded bg-[#fef3c7] px-2 py-0.5 text-[11.5px] font-medium">
                    {order.notes}
                  </p>
                )}
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
              <p
                className="text-center text-[26px] font-bold tracking-[0.18em] tnum"
                dir="ltr"
              >
                {order.reference}
              </p>
            </div>

            {/* COD Badge */}
            <div
              className={`flex items-center justify-between border-t-2 border-foreground px-5 py-3 ${
                order.codAmount > 0 ? "bg-[#dcfce7]" : "bg-[#e0e7ff]"
              }`}
            >
              {order.codAmount > 0 ? (
                <>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">
                    {i.t("label.cod")}
                  </span>
                  <span className="text-[22px] font-bold tnum">
                    {i.money(order.codAmount)}
                  </span>
                </>
              ) : (
                <span className="w-full text-center text-[14px] font-bold uppercase tracking-[0.06em]">
                  {i.t("label.prepaid")}
                </span>
              )}
            </div>

            <div className="border-t border-[#e5e7eb] px-5 py-1 text-center text-[9px] text-[#9ca3af]">
              Bordereau {idx + 1} / {orders.length} — {order.reference}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          @page {
            size: A6 portrait;
            margin: 0;
          }
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
            max-width: none !important;
          }
          .label-sheet {
            page-break-after: always;
            break-after: page;
            height: 100vh;
            border-width: 2px !important;
            border-radius: 0 !important;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}

