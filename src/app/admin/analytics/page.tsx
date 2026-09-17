import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { StatCard, PageHeader } from "@/components/shared";
import { AreaTrend, BarsTrend, ChartCard, HorizontalBars, RateLine } from "@/components/charts";
import { Banknote, CheckCircle2, Percent, RotateCcw, Truck } from "lucide-react";
import { DH } from "@/lib/utils";
import Link from "next/link";

const DAY = 86400000;

export const metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const i = await getI18n();
  const sp = await searchParams;
  const range = Number(sp.range ?? 30) || 30;
  const now = new Date();
  const start = new Date(now.getTime() - (range - 1) * DAY);
  start.setHours(0, 0, 0, 0);

  const orders = await db.order.findMany({
    where: { createdAt: { gte: start } },
    select: { createdAt: true, deliveredAt: true, status: true, total: true, codAmount: true, deliveryCity: true },
  });

  const delivered = orders.filter((o) => o.status === "DELIVERED");
  const failed = orders.filter((o) => o.status === "FAILED");
  const returned = orders.filter((o) => o.status === "RETURNED");
  const gmv = delivered.reduce((a, o) => a + o.total, 0);
  const codVolume = delivered.reduce((a, o) => a + o.codAmount, 0);
  const terminal = delivered.length + failed.length + returned.length;
  const successRate = terminal ? delivered.length / terminal : 0;

  const daily: { label: string; value: number }[] = [];
  const volume: { label: string; value: number }[] = [];
  const rate: { label: string; value: number }[] = [];
  for (let d = range - 1; d >= 0; d--) {
    const day = new Date(now.getTime() - d * DAY);
    const key = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const next = new Date(key.getTime() + DAY);
    const dayOrders = orders.filter((o) => o.createdAt >= key && o.createdAt < next);
    const dayDelivered = dayOrders.filter((o) => o.status === "DELIVERED");
    const label = `${key.getDate()}/${key.getMonth() + 1}`;
    daily.push({ label, value: Math.round(dayDelivered.reduce((a, o) => a + o.total, 0) / DH) });
    volume.push({ label, value: dayOrders.length });
    const t2 = dayDelivered.length + dayOrders.filter((o) => o.status === "FAILED").length;
    rate.push({ label, value: t2 ? Math.round((dayDelivered.length / t2) * 100) : 0 });
  }

  const byCity = Object.entries(
    orders.reduce<Record<string, number>>((acc, o) => { acc[o.deliveryCity] = (acc[o.deliveryCity] ?? 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));

  const ranges = [7, 30, 90];

  return (
    <>
      <PageHeader
        title={i.t("analytics.title")}
        subtitle={i.t("admin.subtitle")}
        actions={
          <div className="flex rounded-lg border border-border bg-surface p-0.5 shadow-xs">
            {ranges.map((r) => (
              <Link key={r} href={`/admin/analytics?range=${r}`}
                className={`rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ${range === r ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {i.t(`analytics.range${r}`)}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={i.t("admin.gmv")} value={i.money(gmv, { compact: true })} icon="Banknote" />
        <StatCard label={i.t("analytics.codVolume")} value={i.money(codVolume, { compact: true })} icon="CheckCircle2" accent="var(--success)" />
        <StatCard label={i.t("analytics.successRate")} value={i.pct(successRate)} icon="Percent" accent="var(--primary)" />
        <StatCard label={i.t("analytics.returnRate")} value={i.pct(orders.length ? returned.length / orders.length : 0)} icon="RotateCcw" accent="var(--chart-4)" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title={i.t("admin.gmvTrend")}>
          <AreaTrend data={daily} height={230} color="var(--chart-1)" />
        </ChartCard>
        <ChartCard title={i.t("admin.volumeTrend")}>
          <BarsTrend data={volume} height={230} color="var(--chart-3)" />
        </ChartCard>
        <ChartCard title={i.t("analytics.successChart")}>
          <RateLine data={rate} height={200} />
        </ChartCard>
        <ChartCard title={i.t("analytics.byCity")}>
          <HorizontalBars data={byCity} color="var(--chart-5)" />
        </ChartCard>
      </div>
    </>
  );
}
