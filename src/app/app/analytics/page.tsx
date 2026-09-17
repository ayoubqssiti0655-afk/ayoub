import Link from "next/link";
import { getMerchantContext } from "@/lib/auth";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { StatCard, PageHeader } from "@/components/shared";
import { AreaTrend, BarsTrend, RateLine, HorizontalBars, DonutChart, ChartLegend, ChartCard } from "@/components/charts";
import { cn } from "@/lib/utils";
import { generateInsights } from "@/server/insights";
import { InsightsCard } from "@/components/merchant/insights-card";
import { Banknote, PackageCheck, Percent, RotateCcw, Timer, Wallet, TrendingUp, Truck } from "lucide-react";
import { DH } from "@/lib/utils";

const DAY = 86400000;

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const ctx = await getMerchantContext();
  if (!ctx) return null;
  const i = await getI18n();
  const sp = await searchParams;
  const range = Number(sp.range ?? 30) || 30;
  const now = new Date();
  const start = new Date(now.getTime() - (range - 1) * DAY);
  start.setHours(0, 0, 0, 0);

  const [orders, codRows, insights] = await Promise.all([
    db.order.findMany({
      where: { merchantId: ctx.merchant.id, createdAt: { gte: start } },
      select: { createdAt: true, deliveredAt: true, status: true, total: true, codAmount: true, shippingFee: true, deliveryCity: true },
    }),
    db.codTransaction.findMany({
      where: { merchantId: ctx.merchant.id, occurredAt: { gte: start }, type: { in: ["COD_COLLECTION", "DELIVERY_FEE", "RETURN_FEE"] } },
      select: { type: true, amount: true, occurredAt: true },
    }),
    generateInsights(ctx.merchant.id, i.locale as "fr" | "ar" | "en"),
  ]);

  const delivered = orders.filter((o) => o.status === "DELIVERED");
  const failed = orders.filter((o) => o.status === "FAILED");
  const returned = orders.filter((o) => o.status === "RETURNED");
  const revenue = delivered.reduce((a, o) => a + o.total, 0);
  const codVolume = delivered.reduce((a, o) => a + o.codAmount, 0);
  const deliveryCosts = codRows.filter((c) => c.type !== "COD_COLLECTION").reduce((a, c) => a - c.amount, 0);
  const successRate = delivered.length + failed.length + returned.length > 0 ? delivered.length / (delivered.length + failed.length + returned.length) : 0;
  const avgHours = delivered.length
    ? delivered.reduce((a, o) => a + (o.deliveredAt!.getTime() - o.createdAt.getTime()), 0) / delivered.length / 3600000
    : 0;

  // daily series
  const daily: { label: string; value: number; secondary: number }[] = [];
  const revenueDaily: { label: string; value: number }[] = [];
  const rateDaily: { label: string; value: number }[] = [];
  for (let d = range - 1; d >= 0; d--) {
    const day = new Date(now.getTime() - d * DAY);
    const key = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const next = new Date(key.getTime() + DAY);
    const dayOrders = orders.filter((o) => o.createdAt >= key && o.createdAt < next);
    const dayDelivered = orders.filter((o) => o.deliveredAt && o.deliveredAt >= key && o.deliveredAt < next);
    const dayFailed = dayOrders.filter((o) => o.status === "FAILED").length;
    daily.push({ label: `${key.getDate()}/${key.getMonth() + 1}`, value: dayOrders.length, secondary: dayFailed });
    revenueDaily.push({ label: `${key.getDate()}/${key.getMonth() + 1}`, value: Math.round(dayDelivered.reduce((a, o) => a + o.total, 0) / DH) });
    const terminal = dayDelivered.length + dayFailed;
    rateDaily.push({ label: `${key.getDate()}/${key.getMonth() + 1}`, value: terminal ? Math.round((dayDelivered.length / terminal) * 100) : 0 });
  }

  const byCity = Object.entries(
    orders.reduce<Record<string, number>>((acc, o) => { acc[o.deliveryCity] = (acc[o.deliveryCity] ?? 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));

  const statusData = [
    { name: i.t("status.DELIVERED"), value: delivered.length, color: "var(--chart-2)" },
    { name: i.t("status.FAILED"), value: failed.length, color: "var(--error)" },
    { name: i.t("status.RETURNED"), value: returned.length, color: "var(--chart-4)" },
    { name: i.t("common.all"), value: orders.length - delivered.length - failed.length - returned.length, color: "var(--chart-3)" },
  ].filter((d) => d.value > 0);
  if (statusData.length === 3 && orders.length - delivered.length - failed.length - returned.length > 0) {
    statusData[2].name = i.t("status.RETURNED");
  }

  const kpis = [
    { label: i.t("analytics.totalOrders"), value: i.num(orders.length), icon: "Truck", color: "var(--info)" },
    { label: i.t("analytics.successRate"), value: i.pct(successRate), icon: "PackageCheck", color: "var(--success)" },
    { label: i.t("analytics.failRate"), value: i.pct(orders.length ? failed.length / orders.length : 0), icon: "Percent", color: "var(--error)" },
    { label: i.t("analytics.returnRate"), value: i.pct(orders.length ? returned.length / orders.length : 0), icon: "RotateCcw", color: "var(--chart-4)" },
    { label: i.t("analytics.avgDeliveryTime"), value: avgHours >= 48 ? i.t("dashboard.days", { n: Math.round(avgHours / 24) }) : i.t("dashboard.hours", { n: Math.round(avgHours) }), icon: "Timer", color: "var(--chart-5)" },
    { label: i.t("analytics.codVolume"), value: i.money(codVolume, { compact: true }), icon: "Wallet", color: "var(--success)" },
    { label: i.t("analytics.netRevenue"), value: i.money(revenue, { compact: true }), icon: "Banknote", color: "var(--primary)" },
    { label: i.t("analytics.deliveryCosts"), value: i.money(deliveryCosts, { compact: true }), icon: "TrendingUp", color: "var(--warning)" },
  ];

  const ranges = [7, 30, 90];

  return (
    <>
      <PageHeader
        title={i.t("analytics.title")}
        subtitle={i.t("analytics.subtitle")}
        actions={
          <div className="flex rounded-lg border border-border bg-surface p-0.5 shadow-xs">
            {ranges.map((r) => (
              <Link
                key={r}
                href={`/app/analytics?range=${r}`}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                  range === r ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {i.t(`analytics.range${r}`)}
              </Link>
            ))}
          </div>
        }
      />

      <div className="mb-4">
        <InsightsCard insights={insights} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value} icon={k.icon} accent={k.color} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title={i.t("analytics.ordersChart")}>
          <BarsTrend data={daily} height={230} stacked color="var(--chart-1)" />
        </ChartCard>
        <ChartCard title={i.t("analytics.revenueChart")}>
          <AreaTrend data={revenueDaily} height={230} color="var(--chart-2)" />
        </ChartCard>
        <ChartCard title={i.t("analytics.successChart")}>
          <RateLine data={rateDaily} height={200} />
        </ChartCard>
        <ChartCard title={i.t("analytics.byCity")}>
          <HorizontalBars data={byCity} color="var(--chart-3)" />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartCard title={i.t("analytics.byStatus")}>
          <DonutChart data={statusData} height={200} />
          <div className="mt-3">
            <ChartLegend items={statusData.map((d) => ({ name: d.name, value: d.value, color: d.color }))} />
          </div>
        </ChartCard>
        <ChartCard title={i.t("analytics.returnsChart")} className="lg:col-span-2">
          <BarsTrend data={daily} height={200} stacked color="var(--error)" />
        </ChartCard>
      </div>
    </>
  );
}
