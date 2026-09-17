import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { StatCard } from "@/components/shared";
import { StatusBadge } from "@/components/status-badge";
import { Avatar } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { CourierAdminActions } from "@/components/admin/courier-detail-actions";
import { DepositsTable, type DepositRow } from "@/components/admin/deposits-table";
import { ChevronLeft, MapPin, Truck } from "lucide-react";
import { avatarHue } from "@/lib/format";
import { getFeatureMap } from "@/server/features";

export default async function AdminCourierDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const i = await getI18n();

  const courier = await db.courier.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      deposits: { orderBy: { declaredAt: "desc" }, take: 20 },
      deliveries: {
        include: { order: { select: { reference: true, deliveryCity: true, codAmount: true, deliveredAt: true, createdAt: true } } },
        orderBy: { updatedAt: "desc" },
        take: 300,
      },
    },
  });
  if (!courier) notFound();
  const features = await getFeatureMap();

  const delivered = courier.deliveries.filter((d) => d.status === "DELIVERED");
  const failed = courier.deliveries.filter((d) => d.status === "FAILED");
  const successRate = delivered.length + failed.length > 0 ? delivered.length / (delivered.length + failed.length) : 0;
  const avgHours = delivered.length
    ? delivered.reduce((a, d) => a + (d.order.deliveredAt && d.order.createdAt ? d.order.deliveredAt.getTime() - d.order.createdAt.getTime() : 0), 0) / delivered.length / 3600000
    : 0;
  const zones = JSON.parse(courier.zones) as string[];

  return (
    <>
      <div className="mb-4">
        <Link href="/admin/couriers" className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-3.5 rtl:rotate-180" /> {i.t("admin.couriers.title")}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={courier.user.name} size={44} hue={avatarHue(courier.user.name)} />
            <div>
              <h1 className="text-[19px] font-semibold tracking-[-0.02em]">{courier.user.name}</h1>
              <p className="text-[13px] text-muted-foreground tnum">{courier.employeeCode} · {courier.user.email}</p>
            </div>
            <StatusBadge status={courier.status} />
          </div>
          <CourierAdminActions id={courier.id} status={courier.status} zones={zones} allCities={["Casablanca", "Mohammedia", "Rabat", "Salé", "Témara", "Kénitra", "Marrakech", "Safi", "Fès", "Meknès", "Tanger", "Tétouan", "Agadir", "Inezgane", "Oujda", "Nador", "Béni Mellal", "El Jadida", "Settat", "Essaouira"]} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={i.t("admin.couriers.deliveriesCount")} value={i.num(delivered.length)} accent="var(--success)" />
        <StatCard label={i.t("admin.couriers.table.success")} value={i.pct(successRate)} accent="var(--primary)" />
        <StatCard label={i.t("status.FAILED")} value={i.num(failed.length)} accent="var(--error)" />
        <StatCard label={i.t("admin.couriers.avgTime")} value={avgHours >= 48 ? i.t("dashboard.days", { n: Math.round(avgHours / 24) }) : i.t("dashboard.hours", { n: Math.round(avgHours) })} accent="var(--chart-4)" />
      </div>

      {features.cash_reconciliation && courier.deposits.length > 0 && (
        <div className="mb-4">
          <DepositsTable deposits={courier.deposits.map((d) => ({
            id: d.id, amount: d.amount, expectedAmount: d.expectedAmount, difference: d.difference,
            status: d.status, declaredAt: d.declaredAt.toISOString(), note: d.note, hasPhoto: !!d.proofPhoto,
          })) as DepositRow[]} />
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardContent className="p-0">
            <h2 className="border-b border-border px-4 py-3 text-[13.5px] font-semibold">{i.t("nav.deliveries")}</h2>
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {courier.deliveries.slice(0, 30).map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium tnum">{d.order.reference}</p>
                    <p className="text-[12px] text-muted-foreground">{d.order.deliveryCity} · {d.order.codAmount > 0 ? i.money(d.order.codAmount, { compact: true }) : "—"}</p>
                  </div>
                  <StatusBadge status={d.status} size="sm" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 text-[13.5px] font-semibold">{i.t("admin.couriers.zones")}</h2>
            <ul className="space-y-1.5">
              {zones.map((z) => (
                <li key={z} className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <MapPin className="size-3.5 text-primary" /> {z}
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-border pt-3">
              <p className="flex items-center gap-2 text-[13px]"><Truck className="size-4 text-muted-foreground" /> {i.t(`vehicle.${courier.vehicle}`)}</p>
              <p className="mt-2 text-[12.5px] text-muted-foreground">{i.t("courier.rating")} : <strong className="text-foreground">★ {courier.rating.toFixed(1)}</strong></p>
              <p className="mt-1 text-[12.5px] text-muted-foreground tnum" dir="ltr">{i.phone(courier.user.phone)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
