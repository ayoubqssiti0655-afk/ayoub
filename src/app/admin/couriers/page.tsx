import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { PageHeader } from "@/components/shared";
import { CouriersClient, type CourierRow } from "@/components/admin/couriers-client";

export const metadata = { title: "Couriers" };

export default async function AdminCouriersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const i = await getI18n();
  const sp = await searchParams;
  const q = sp.q ?? "";

  const couriers = await db.courier.findMany({
    where: q ? { user: { OR: [{ name: { contains: q } }, { email: { contains: q } }] } } : {},
    include: {
      user: { select: { name: true, email: true } },
      deliveries: { select: { status: true } },
    },
    orderBy: { employeeCode: "asc" },
  });

  const cities = await db.city.findMany({ orderBy: { nameFr: "asc" } });
  const rows: CourierRow[] = couriers.map((c) => {
    const delivered = c.deliveries.filter((d) => d.status === "DELIVERED").length;
    const failed = c.deliveries.filter((d) => d.status === "FAILED").length;
    const rate = delivered + failed > 0 ? delivered / (delivered + failed) : 0;
    return {
      id: c.id, name: c.user.name, email: c.user.email, employeeCode: c.employeeCode,
      city: c.homeCity, vehicle: c.vehicle, status: c.status, rating: c.rating,
      delivered, successRate: rate, earnings: delivered * c.feePerDelivery, lastSeenAt: c.lastSeenAt?.toISOString() ?? null,
    };
  });

  /* Keep the courier's negotiated fee when displaying earnings. */
  return (
    <>
      <PageHeader title={i.t("admin.couriers.title")} subtitle={`${i.num(rows.length)} ${i.t("nav.couriers").toLowerCase()}`} />
      <CouriersClient rows={rows} cities={cities.map((c) => c.nameFr)} />
    </>
  );
}
