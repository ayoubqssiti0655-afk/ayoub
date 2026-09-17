import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/server/db";
import { getMerchantContext } from "@/lib/auth";
import { isFeatureEnabled } from "@/server/features";
import { ShippingLabelView, type PrintableOrderLabel } from "@/components/merchant/shipping-label-view";

export const metadata = { title: "A6 Shipping Labels" };

export default async function BulkLabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids: idsParam } = await searchParams;
  const ctx = await getMerchantContext();
  if (!ctx) redirect("/login");

  const ids = (idsParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) notFound();

  const [orders, thermalEnabled] = await Promise.all([
    db.order.findMany({
      where: {
        id: { in: ids },
        merchantId: ctx.merchant.id,
      },
      include: { customer: true, merchant: true },
    }),
    isFeatureEnabled("thermal_labels"),
  ]);

  if (orders.length === 0) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const labelsData: PrintableOrderLabel[] = await Promise.all(
    orders.map(async (order) => {
      const qr = await QRCode.toDataURL(`${appUrl}/track?ref=${order.reference}`, {
        margin: 0,
        width: 300,
        color: { dark: "#111827", light: "#ffffff" },
      });
      return {
        id: order.id,
        reference: order.reference,
        merchantName: order.merchant.name,
        merchantPhone: order.merchant.phone,
        customerName: order.customer.fullName,
        customerPhone: order.customer.phone,
        deliveryAddress: order.deliveryAddress,
        deliveryCity: order.deliveryCity,
        postalCode: order.postalCode,
        notes: order.notes,
        internalNote: order.internalNote,
        codAmount: order.codAmount,
        qr,
        allowOpenParcel:
          order.notes?.includes("[OUVRIR_COLIS]") ||
          order.internalNote?.includes("[OUVRIR_COLIS]") ||
          false,
      };
    })
  );

  return (
    <ShippingLabelView
      orders={labelsData}
      backHref="/app/orders"
      thermalEnabled={thermalEnabled}
    />
  );
}
