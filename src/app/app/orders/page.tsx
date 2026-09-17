import Link from "next/link";
import { Suspense } from "react";
import { getMerchantContext } from "@/lib/auth";
import { listOrders, getMerchantCities } from "@/server/queries";
import { getI18n } from "@/i18n/server";
import { db } from "@/server/db";
import { PageHeader } from "@/components/shared";
import { OrdersTable, type OrderRow } from "@/components/merchant/orders-table";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TableSkeleton } from "@/components/shared";
import { getFeatureMap } from "@/server/features";

export const metadata = { title: "Orders" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getMerchantContext();
  if (!ctx) return null;
  const i = await getI18n();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const params = {
    q: get("q"),
    status: get("status"),
    city: get("city"),
    courier: get("courier"),
    from: get("from"),
    to: get("to"),
    sort: get("sort"),
    page: Number(get("page") ?? 1),
    per: Number(get("per") ?? 20),
  };

  const [result, cities, couriers, features] = await Promise.all([
    listOrders(ctx.merchant.id, params),
    getMerchantCities(ctx.merchant.id),
    db.courier.findMany({ where: { status: "ACTIVE" }, include: { user: { select: { name: true } } }, orderBy: { employeeCode: "asc" } }),
    getFeatureMap(),
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
      <PageHeader
        title={i.t("orders.title")}
        subtitle={i.t("orders.subtitle", { count: i.num(result.total) })}
        actions={
          <Link href="/app/orders/new" className={buttonVariants({})}>
            <Plus className="size-4" /> {i.t("orders.newOrder")}
          </Link>
        }
      />
      <Suspense fallback={<TableSkeleton />}>
        <OrdersTable
          rows={rows}
          total={result.total}
          page={result.page}
          per={result.per}
          totalPages={result.totalPages}
          cities={cities}
          couriers={couriers.map((c) => ({ id: c.id, name: c.user.name }))}
          autoAssignEnabled={features.auto_dispatch}
        />
      </Suspense>
    </>
  );
}
