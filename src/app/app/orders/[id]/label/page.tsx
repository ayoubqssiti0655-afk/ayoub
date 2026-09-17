import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/server/db";
import { getMerchantContext } from "@/lib/auth";
import { isFeatureEnabled } from "@/server/features";
import { ShippingLabelView, type PrintableOrderLabel } from "@/components/merchant/shipping-label-view";

export const metadata = { title: "Parcel label" };

export default async function OrderLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getMerchantContext();
  if (!ctx) return null;

  const [order, thermalEnabled] = await Promise.all([
    db.order.findFirst({
      where: { id, merchantId: ctx.merchant.id },
      include: { customer: true, merchant: true },
    }),
    isFeatureEnabled("thermal_labels"),
  ]);
  if (!order) notFound();

  const qr = await QRCode.toDataURL(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/track?ref=${order.reference}`,
    {
      margin: 0,
      width: 300,
      color: { dark: "#111827", light: "#ffffff" },
    }
  );

  const labelData: PrintableOrderLabel = {
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

  return (
    <ShippingLabelView
      orders={[labelData]}
      backHref={`/app/orders/${order.id}`}
      thermalEnabled={thermalEnabled}
    />
  );
}
