import { getCurrentUser } from "@/lib/auth";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { EmptyState, PageHeader } from "@/components/shared";
import { StatusBadge } from "@/components/status-badge";
import Link from "next/link";

export const metadata = { title: "Deliveries" };

export default async function CourierDeliveriesPage() {
  const user = await getCurrentUser();
  if (!user?.courierProfile) return null;
  const i = await getI18n();

  const [active, assigned] = await Promise.all([
    db.delivery.findMany({
      where: { courierId: user.courierProfile.id, status: { in: ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"] } },
      include: { order: { include: { customer: true } } },
      orderBy: { updatedAt: "asc" },
    }),
    db.delivery.findMany({
      where: { courierId: user.courierProfile.id, status: "ASSIGNED" },
      include: { order: { include: { customer: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const all = [...assigned, ...active];

  return (
    <>
      <h1 className="text-[20px] font-semibold tracking-[-0.02em]">{i.t("courier.deliveriesTitle")}</h1>
      <div className="mt-4 space-y-2.5">
        {all.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface shadow-xs">
            <EmptyState icon="Package" title={i.t("courier.empty")} description={i.t("courier.emptyDesc")} className="py-10" />
          </div>
        ) : (
          all.map((d) => (
            <Link
              key={d.id}
              href={`/courier/deliveries/${d.id}`}
              className="block rounded-xl border border-border bg-surface p-3.5 shadow-xs transition-shadow hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{d.order.customer.fullName}</p>
                {d.order.codAmount > 0 && <span className="text-[13.5px] font-semibold text-success tnum">{i.money(d.order.codAmount, { compact: true })}</span>}
                <StatusBadge status={d.status} size="sm" />
              </div>
              <p className="mt-1 truncate text-[12.5px] text-muted-foreground">{d.order.deliveryCity} · {d.order.deliveryAddress}</p>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
