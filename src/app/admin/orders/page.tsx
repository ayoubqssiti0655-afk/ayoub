import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { listOrders, getMerchantCities } from "@/server/queries";
import { PageHeader } from "@/components/shared";
import { OrdersTable, type OrderRow } from "@/components/merchant/orders-table";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const i = await getI18n();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const params = {
    merchant: get("merchant"),
    q: get("q"), status: get("status"), city: get("city"), courier: get("courier"),
    from: get("from"), to: get("to"), sort: get("sort"), ref: get("ref"),
    page: Number(get("page") ?? 1), per: Number(get("per") ?? 20),
  };
  if (params.ref) params.q = params.ref;

  const [result, cities, couriers] = await Promise.all([
    listOrders(null, params),
    getMerchantCities(null),
    db.courier.findMany({ where: { status: "ACTIVE" }, include: { user: { select: { name: true } } } }),
  ]);

  const rows: OrderRow[] = result.rows.map((o) => ({
    id: o.id,
    reference: o.reference,
    status: o.status,
    total: o.total,
    codAmount: o.codAmount,
    deliveryCity: o.deliveryCity,
    source: o.source,
    createdAt: o.createdAt.toISOString(),
    customer: { fullName: o.customer.fullName, phone: o.customer.phone },
    courierName: o.courier?.user.name ?? null,
    courierId: o.courierId,
  }));

  return (
    <>
      <PageHeader title={i.t("nav.orders")} subtitle={i.t("orders.subtitle", { count: i.num(result.total) })} />
      <OrdersTable
        rows={rows}
        total={result.total}
        page={result.page}
        per={result.per}
        totalPages={result.totalPages}
        cities={cities}
        couriers={couriers.map((c) => ({ id: c.id, name: c.user.name }))}
        basePath="/admin/orders"
      />
    </>
  );
}
