import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { PageHeader } from "@/components/shared";
import { DeliveriesClient, type AdminDeliveryRow } from "@/components/admin/deliveries-client";

export const metadata = { title: "Deliveries" };

export default async function AdminDeliveriesPage() {
  const i = await getI18n();
  const [deliveries, couriers, cities] = await Promise.all([
    db.delivery.findMany({
      where: { status: { notIn: ["DELIVERED", "RETURNED"] } },
      include: {
        order: { include: { customer: { select: { fullName: true } }, merchant: { select: { name: true } } } },
        courier: { include: { user: { select: { name: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    db.courier.findMany({ where: { status: "ACTIVE" }, include: { user: { select: { name: true } } }, orderBy: { employeeCode: "asc" } }),
    db.city.findMany({ orderBy: { nameFr: "asc" }, select: { nameFr: true } }),
  ]);

  const rows: AdminDeliveryRow[] = deliveries.map((delivery) => ({
    id: delivery.id,
    orderId: delivery.orderId,
    reference: delivery.order.reference,
    merchant: delivery.order.merchant.name,
    customer: delivery.order.customer.fullName,
    city: delivery.order.deliveryCity,
    status: delivery.status,
    attempts: delivery.attempts,
    courierId: delivery.courierId,
    courierName: delivery.courier?.user.name ?? null,
    updatedAt: delivery.updatedAt.toISOString(),
    nextActionAt: delivery.nextActionAt?.toISOString() ?? null,
    gpsLat: delivery.gpsLat,
    gpsLng: delivery.gpsLng,
  }));

  return (
    <>
      <PageHeader title={i.t("deliveries.title")} subtitle={i.t("deliveries.subtitle")} />
      <DeliveriesClient rows={rows} cities={cities.map((city) => city.nameFr)} couriers={couriers.map((courier) => ({ id: courier.id, name: courier.user.name, city: courier.homeCity }))} />
    </>
  );
}
