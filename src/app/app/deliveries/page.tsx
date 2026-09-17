import { getMerchantContext } from "@/lib/auth";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { isFeatureEnabled } from "@/server/features";
import { PageHeader, EmptyState } from "@/components/shared";
import { StatusBadge } from "@/components/status-badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { MerchantDeliveriesClient, type MerchantDeliveryItem, type CourierOption } from "@/components/merchant/merchant-deliveries-client";
import Link from "next/link";

export const metadata = { title: "Deliveries" };

export default async function DeliveriesPage() {
  const ctx = await getMerchantContext();
  if (!ctx) return null;
  const i = await getI18n();

  const [controlCenterEnabled, deliveries, couriers, cities] = await Promise.all([
    isFeatureEnabled("delivery_control_center"),
    db.delivery.findMany({
      where: { order: { merchantId: ctx.merchant.id }, status: { notIn: ["DELIVERED", "RETURNED"] } },
      include: {
        order: { include: { customer: true } },
        courier: { include: { user: { select: { name: true, phone: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    db.courier.findMany({
      where: { status: "ACTIVE" },
      include: { user: { select: { name: true, phone: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    db.city.findMany({
      orderBy: { nameFr: "asc" },
      select: { nameFr: true },
    }),
  ]);

  if (controlCenterEnabled) {
    const deliveryItems: MerchantDeliveryItem[] = deliveries.map((d) => ({
      id: d.id,
      orderId: d.orderId,
      reference: d.order.reference,
      customerName: d.order.customer.fullName,
      customerPhone: d.order.customer.phone,
      deliveryCity: d.order.deliveryCity,
      deliveryAddress: d.order.deliveryAddress,
      status: d.status,
      attempts: d.attempts,
      codAmount: d.order.codAmount,
      courierId: d.courierId,
      courierName: d.courier?.user.name ?? null,
      courierPhone: d.courier?.user.phone ?? null,
      courierVehicle: d.courier?.vehicle ?? null,
      lastAttemptReason: d.failureReason ?? null,
      gpsLat: d.gpsLat ?? null,
      gpsLng: d.gpsLng ?? null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));

    const courierOptions: CourierOption[] = couriers.map((c) => ({
      id: c.id,
      name: c.user.name,
      city: c.homeCity,
      phone: c.user.phone ?? "",
      vehicle: c.vehicle,
    }));

    const cityNames = cities.map((c) => c.nameFr);

    return (
      <>
        <PageHeader title={i.t("deliveries.title")} subtitle={i.t("deliveries.subtitle")} />
        <MerchantDeliveriesClient
          deliveries={deliveryItems}
          couriers={courierOptions}
          cities={cityNames}
          merchantName={ctx.merchant.name}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title={i.t("deliveries.title")} subtitle={i.t("deliveries.subtitle")} />
      <div className="rounded-xl border border-border bg-surface shadow-xs">
        {deliveries.length === 0 ? (
          <EmptyState icon="Truck" title={i.t("deliveries.empty")} description={i.t("deliveries.emptyDesc")} />
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>{i.t("deliveries.table.order")}</TH>
                <TH>{i.t("orders.table.customer")}</TH>
                <TH>{i.t("common.city")}</TH>
                <TH>{i.t("common.status")}</TH>
                <TH className="text-center">{i.t("deliveries.table.attempts")}</TH>
                <TH className="text-end">{i.t("deliveries.table.cod")}</TH>
                <TH className="hidden lg:table-cell">{i.t("common.courier")}</TH>
              </TR>
            </THead>
            <TBody>
              {deliveries.map((d) => (
                <TR key={d.id}>
                  <TD>
                    <Link href={`/app/orders/${d.orderId}`} className="font-semibold tnum hover:text-primary hover:underline">
                      {d.order.reference}
                    </Link>
                  </TD>
                  <TD className="font-medium">{d.order.customer.fullName}</TD>
                  <TD>{d.order.deliveryCity}</TD>
                  <TD><StatusBadge status={d.status} /></TD>
                  <TD className="text-center tnum">{d.attempts}/3</TD>
                  <TD className="text-end font-medium tnum">{d.order.codAmount > 0 ? i.money(d.order.codAmount) : "—"}</TD>
                  <TD className="hidden text-muted-foreground lg:table-cell">{d.courier?.user.name ?? i.t("common.unassigned")}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </>
  );
}
