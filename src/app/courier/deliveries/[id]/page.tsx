import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { CourierDeliveryClient } from "@/components/courier/courier-delivery-client";
import { getFeatureMap } from "@/server/features";

export const metadata = { title: "Delivery" };

export default async function CourierDeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user?.courierProfile) return null;
  const i = await getI18n();

  const delivery = await db.delivery.findFirst({
    where: { id, courierId: user.courierProfile.id },
    include: {
      order: { include: { customer: true, merchant: { select: { name: true } } } },
    },
  });
  if (!delivery) notFound();
  const features = await getFeatureMap();

  return (
    <CourierDeliveryClient
      d={{
        id: delivery.id,
        reference: delivery.order.reference,
        status: delivery.status,
        otpRequired: !!delivery.otpCode,
        customerName: delivery.order.customer.fullName,
        customerPhone: delivery.order.customer.phone,
        address: delivery.order.deliveryAddress,
        city: delivery.order.deliveryCity,
        codAmount: delivery.order.codAmount,
        attempts: delivery.attempts,
        note: delivery.order.notes,
        merchantName: delivery.order.merchant.name,
        gpsLat: delivery.gpsLat,
        gpsLng: delivery.gpsLng,
        exchangeFor: delivery.order.exchangeFor,
        slotDate: delivery.order.slotDate,
        slotWindow: delivery.order.slotWindow,
      }}
      exchangeEnabled={features.exchange_orders}
    />
  );
}
