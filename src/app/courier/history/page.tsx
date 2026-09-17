import { getCurrentUser } from "@/lib/auth";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { EmptyState } from "@/components/shared";
import { MapPin } from "lucide-react";

export const metadata = { title: "History" };

export default async function CourierHistoryPage() {
  const user = await getCurrentUser();
  if (!user?.courierProfile) return null;
  const i = await getI18n();

  const delivered = await db.delivery.findMany({
    where: { courierId: user.courierProfile.id, status: { in: ["DELIVERED", "RETURNED", "FAILED"] } },
    include: { order: { include: { customer: true } } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <>
      <h1 className="text-[20px] font-semibold tracking-[-0.02em]">{i.t("courier.historyTitle")}</h1>
      <div className="mt-4 space-y-2.5">
        {delivered.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface shadow-xs">
            <EmptyState icon="PackageCheck" title={i.t("courier.historyEmpty")} className="py-10" />
          </div>
        ) : (
          delivered.map((d) => (
            <div key={d.id} className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{d.order.customer.fullName}</p>
                {d.codCollected > 0 && <span className="text-[13px] font-semibold text-success tnum">+{i.money(d.codCollected, { compact: true })}</span>}
                <span className="text-[11.5px] font-medium" style={{ color: d.status === "DELIVERED" ? "var(--success)" : d.status === "FAILED" ? "var(--error)" : "var(--violet)" }}>
                  {i.t(`status.${d.status}`)}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                {d.order.deliveryCity} · {i.dateTime(d.deliveredAt ?? d.updatedAt)}
              </p>
            </div>
          ))
        )}
      </div>
    </>
  );
}
