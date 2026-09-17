import Link from "next/link";
import { getMerchantContext } from "@/lib/auth";
import { db } from "@/server/db";
import { getMerchantDashboard } from "@/server/queries";
import { getFeatureMap } from "@/server/features";
import { getI18n } from "@/i18n/server";
import { StatCard, PageHeader, EmptyState } from "@/components/shared";
import { StatusBadge } from "@/components/status-badge";
import { AreaTrend, BarsTrend, DonutChart, ChartLegend, ChartCard, HorizontalBars } from "@/components/charts";
import { Button, buttonVariants } from "@/components/ui/button";
import { DigestCard } from "@/components/merchant/wallet-instant";
import { AlertTriangle, Banknote, CheckCircle2, ClipboardList, PackageCheck, Timer, TrendingUp, Truck, Users, Wallet } from "lucide-react";

export default async function MerchantDashboard() {
  const ctx = await getMerchantContext();
  if (!ctx) return null;
  const { merchant } = ctx;
  const i = await getI18n();
  const [s, features, lowStock] = await Promise.all([
    getMerchantDashboard(merchant.id),
    getFeatureMap(),
    db.product.count({ where: { merchantId: merchant.id, isActive: true, stock: { lte: 10 } } }),
  ]);

  const revenueDelta = s.prevRevenue30 > 0 ? (s.revenue30 - s.prevRevenue30) / s.prevRevenue30 : 0;
  const ordersDelta = s.prevDeliveredCount30 > 0 ? (s.deliveredCount30 - s.prevDeliveredCount30) / s.prevDeliveredCount30 : 0;

  const statusColors: Record<string, string> = {
    DELIVERED: "var(--chart-2)",
    IN_TRANSIT: "var(--chart-3)",
    OUT_FOR_DELIVERY: "var(--chart-1)",
    CONFIRMED: "var(--chart-5)",
    FAILED: "var(--error)",
    RETURNED: "var(--chart-4)",
    NEW: "var(--chart-1)",
  };
  const donutData = [
    { name: i.t("status.DELIVERED"), value: s.counts.delivered, color: statusColors.DELIVERED },
    { name: i.t("status.IN_TRANSIT"), value: s.counts.inTransit + s.counts.outForDelivery, color: statusColors.IN_TRANSIT },
    { name: i.t("status.CONFIRMED"), value: s.counts.confirmed + s.counts.ready, color: statusColors.CONFIRMED },
    { name: i.t("status.FAILED"), value: s.counts.failed, color: statusColors.FAILED },
    { name: i.t("status.RETURNED"), value: s.counts.returned, color: statusColors.RETURNED },
  ].filter((d) => d.value > 0);

  const alerts = [
    s.counts.new > 0 && { tone: "warning" as const, text: i.t("dashboard.newOrdersNeedConfirm", { count: s.counts.new }), href: "/app/orders?status=NEW" },
    s.counts.failed > 0 && { tone: "error" as const, text: i.t("dashboard.failedNeedRetry", { count: s.counts.failed }), href: "/app/orders?status=FAILED" },
    s.pendingSettle > 0 && { tone: "info" as const, text: i.t("dashboard.codReadySettle", { count: s.pendingSettle }), href: "/app/wallet" },
    lowStock > 0 && features.stock_management && { tone: "warning" as const, text: i.t("stock.lowAlert", { count: lowStock }), href: "/app/products" },
  ].filter(Boolean) as { tone: "warning" | "error" | "info"; text: string; href: string }[];

  return (
    <>
      <PageHeader
        title={i.t("dashboard.title")}
        subtitle={i.t("dashboard.subtitle")}
        actions={
          <>
            <Link href="/app/orders" className={buttonVariants({ variant: "outline" })}>{i.t("dashboard.viewOrders")}</Link>
            <Link href="/app/orders/new" className={buttonVariants({})}>{i.t("dashboard.createOrder")}</Link>
            {features.daily_digest && <DigestCard />}
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={i.t("dashboard.todayOrders")} value={i.num(s.todayCount)} icon="ClipboardList" hint={i.t("dashboard.vsYesterday")} />
        <StatCard label={i.t("dashboard.delivered")} value={i.num(s.counts.delivered)} icon="PackageCheck" accent="var(--success)" />
        <StatCard label={i.t("dashboard.inTransit")} value={i.num(s.counts.inTransit + s.counts.outForDelivery)} icon="Truck" accent="var(--info)" hint={`${s.counts.outForDelivery} ${i.t("dashboard.outForDelivery").toLowerCase()}`} />
        <StatCard label={i.t("dashboard.successRate")} value={i.pct(s.successRate, 1)} icon="TrendingUp" accent="var(--chart-5)" hint="30 j" />
        <StatCard label={i.t("dashboard.revenue")} value={i.money(s.revenue30, { compact: true })} delta={`${revenueDelta >= 0 ? "+" : "−"}${i.pct(Math.abs(revenueDelta))}`} deltaGood={revenueDelta >= 0} icon="Banknote" />
        <StatCard label={i.t("dashboard.codCollected")} value={i.money(s.codCollected, { compact: true })} icon="Wallet" accent="var(--success)" hint={i.t("dashboard.codPending") + " : " + i.money(s.codFees * -1, { compact: true })} />
        <StatCard label={i.t("dashboard.failed")} value={i.num(s.counts.failed)} icon="AlertTriangle" accent="var(--error)" hint="30 j" />
        <StatCard label={i.t("dashboard.avgDeliveryTime")} value={avgHoursLabel(s.avgHours, i)} icon="Timer" accent="var(--chart-4)" />
      </div>

      {/* alerts */}
      {alerts.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((a, idx) => (
            <Link
              key={idx}
              href={a.href}
              className="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-colors hover:shadow-xs"
              style={{
                borderColor: a.tone === "warning" ? "color-mix(in srgb, var(--warning) 30%, transparent)" : a.tone === "error" ? "color-mix(in srgb, var(--error) 30%, transparent)" : "color-mix(in srgb, var(--info) 30%, transparent)",
                background: a.tone === "warning" ? "var(--warning-soft)" : a.tone === "error" ? "var(--error-soft)" : "var(--info-soft)",
                color: a.tone === "warning" ? "var(--warning)" : a.tone === "error" ? "var(--error)" : "var(--info)",
              }}
            >
              <AlertTriangle className="size-4 shrink-0" />
              <span className="flex-1">{a.text}</span>
              <span aria-hidden>→</span>
            </Link>
          ))}
        </div>
      )}

      {/* charts */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartCard title={i.t("dashboard.ordersTrend")} className="lg:col-span-2">
          <AreaTrend data={s.series} height={252} />
        </ChartCard>
        <ChartCard title={i.t("dashboard.statusBreakdown")}>
          {donutData.length ? (
            <>
              <DonutChart data={donutData} />
              <div className="mt-2">
                <ChartLegend items={donutData.map((d) => ({ name: d.name, value: d.value, color: d.color }))} />
              </div>
            </>
          ) : (
            <EmptyState title={i.t("common.noResults")} className="py-10" />
          )}
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartCard title={i.t("dashboard.revenueTrend")} className="lg:col-span-2">
          <BarsTrend data={s.revenueSeries} height={210} color="var(--chart-2)" />
        </ChartCard>
        <ChartCard title={i.t("dashboard.topCities")}>
          <HorizontalBars data={s.topCities} color="var(--chart-3)" />
        </ChartCard>
      </div>

      {/* recent orders + activity */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-[13.5px] font-semibold">{i.t("dashboard.recentOrders")}</h3>
            <Link href="/app/orders" className="text-[12.5px] font-medium text-primary hover:underline">{i.t("common.viewAll")}</Link>
          </div>
          {s.recent.length === 0 ? (
            <EmptyState icon="ClipboardList" title={i.t("orders.empty")} description={i.t("orders.emptyDesc")} />
          ) : (
            <ul>
              {s.recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/app/orders/${o.id}`} className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 transition-colors last:border-0 hover:bg-surface-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold tnum">{o.reference}</span>
                        <StatusBadge status={o.status} size="sm" />
                      </div>
                      <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
                        {o.customer.fullName} · {o.deliveryCity} · {i.rel(o.createdAt)}
                      </p>
                    </div>
                    <span className="text-[13px] font-semibold tnum">{i.money(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface shadow-xs">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-[13.5px] font-semibold">{i.t("dashboard.activity")}</h3>
          </div>
          {s.events.length === 0 ? (
            <EmptyState icon="CheckCircle2" title={i.t("dashboard.noAlerts")} className="py-10" />
          ) : (
            <ul className="px-4 py-3">
              {s.events.map((e) => {
                const dotColor = e.type === "DELIVERED" ? "var(--success)" : e.type === "FAILED" ? "var(--error)" : e.type === "RETURNED" ? "var(--violet)" : "var(--info)";
                return (
                <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                  <span className="relative mt-1.5 size-2 shrink-0 rounded-full" style={{ background: dotColor }} />
                  <span className="absolute bottom-0 start-[3.5px] top-4 w-px bg-border" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium leading-5">
                      {i.t(`event.${e.type}`)}
                      {e.order?.reference && <span className="font-normal text-muted-foreground"> · {e.order.reference}</span>}
                    </p>
                    {e.message && <p className="truncate text-[12px] leading-5 text-muted-foreground">{e.message}</p>}
                    <p className="text-[11px] text-faint">{i.rel(e.createdAt)}</p>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function avgHoursLabel(h: number, i: Awaited<ReturnType<typeof getI18n>>) {
  if (!h) return "—";
  if (h >= 48) return i.t("dashboard.days", { n: Math.round(h / 24) });
  return i.t("dashboard.hours", { n: Math.round(h) });
}
