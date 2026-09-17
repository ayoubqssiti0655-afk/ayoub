import { getCurrentUser } from "@/lib/auth";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { Banknote, PackageCheck } from "lucide-react";
import { DH } from "@/lib/utils";
import { cashSummary } from "@/server/cash";
import { getFeatureMap } from "@/server/features";
import { CashDeclaration } from "@/components/courier/cash-declaration";

export const metadata = { title: "Earnings" };

export default async function CourierEarningsPage() {
  const user = await getCurrentUser();
  if (!user?.courierProfile) return null;
  const i = await getI18n();
  const courier = user.courierProfile;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday.getTime() - 6 * 86400000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [today, week, month, pendingAgg, features, cash] = await Promise.all([
    db.delivery.count({ where: { courierId: courier.id, status: "DELIVERED", deliveredAt: { gte: startOfToday } } }),
    db.delivery.count({ where: { courierId: courier.id, status: "DELIVERED", deliveredAt: { gte: startOfWeek } } }),
    db.delivery.count({ where: { courierId: courier.id, status: "DELIVERED", deliveredAt: { gte: startOfMonth } } }),
    db.delivery.aggregate({ where: { courierId: courier.id, status: { notIn: ["DELIVERED", "RETURNED"] } }, _count: true }),
    getFeatureMap(),
    cashSummary(courier.id),
  ]);

  const cards = [
    { label: i.t("common.today"), parcels: today, amount: today * courier.feePerDelivery, accent: true },
    { label: i.t("courier.earningsThisWeek"), parcels: week, amount: week * courier.feePerDelivery },
    { label: i.t("courier.earningsThisMonth"), parcels: month, amount: month * courier.feePerDelivery },
  ];

  return (
    <>
      <h1 className="text-[20px] font-semibold tracking-[-0.02em]">{i.t("courier.earnings")}</h1>
      <p className="mt-0.5 text-[13px] text-muted-foreground">{i.t("courier.earningsPerParcel", { fee: i.money(courier.feePerDelivery) })}</p>

      {features.cash_reconciliation && (
        <div className="mb-4">
          <CashDeclaration summary={cash} />
        </div>
      )}

      <div className="mt-4 space-y-3">
        {cards.map((c, idx) => (
          <div
            key={c.label}
            className={`flex items-center justify-between rounded-xl border p-4 shadow-xs ${idx === 0 ? "border-primary/25 bg-primary-soft" : "border-border bg-surface"}`}
          >
            <div>
              <p className={`text-[12.5px] font-medium ${idx === 0 ? "text-primary" : "text-muted-foreground"}`}>{c.label}</p>
              <p className={`mt-0.5 flex items-center gap-1.5 text-[12px] ${idx === 0 ? "text-primary/75" : "text-faint"}`}>
                <PackageCheck className="size-3.5" /> {i.num(c.parcels)} {i.t("courier.deliveredParcels").toLowerCase()}
              </p>
            </div>
            <p className={`flex items-center gap-1.5 text-[22px] font-semibold tnum ${idx === 0 ? "text-primary" : ""}`}>
              <Banknote className="size-5 opacity-50" />
              {i.money(c.amount, { compact: true })}
            </p>
          </div>
        ))}

        <div className="rounded-xl border border-warning/25 bg-warning-soft p-4">
          <p className="text-[12.5px] font-medium text-warning">{i.t("courier.earningsPending")}</p>
          <p className="mt-0.5 text-[18px] font-semibold text-warning tnum">
            {i.money(pendingAgg._count * courier.feePerDelivery)}
          </p>
          <p className="text-[11.5px] text-warning/70">{pendingAgg._count} {i.t("courier.toDeliver").toLowerCase()}</p>
        </div>
      </div>
    </>
  );
}
