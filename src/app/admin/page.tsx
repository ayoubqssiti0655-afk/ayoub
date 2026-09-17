import Link from "next/link";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { StatCard, PageHeader } from "@/components/shared";
import { StatusBadge } from "@/components/status-badge";
import { AreaTrend, BarsTrend, ChartCard, HorizontalBars } from "@/components/charts";
import { buttonVariants } from "@/components/ui/button";
import { Activity, Banknote, Bike, Building2, CheckCircle2, PackageCheck, Truck, Wallet } from "lucide-react";
import { DH } from "@/lib/utils";
import { forecastDemand } from "@/server/forecast";
import { getFeatureMap } from "@/server/features";
import { TrendingUp as TrendIcon } from "lucide-react";
import { ControlTower, type CourierLiveInfo, type RiskAlert } from "@/components/admin/control-tower";
import { CentralCaisseRadar, type CaisseRadarData } from "@/components/admin/central-caisse-radar";
import { SmartDispatcher, type CityPendingDispatch } from "@/components/admin/smart-dispatcher";
import { RiskRadar, type HighRiskOrder } from "@/components/admin/risk-radar";

const DAY = 86400000;

export const metadata = { title: "Admin" };

export default async function AdminDashboard() {
  const i = await getI18n();
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * DAY);
  const prev30 = new Date(now.getTime() - 60 * DAY);

  const [
    merchants, activeCouriers, statusGroups, gmv, prevGmv, codAvailable, recentMerchants, topMerchants, series30, cityRows,
  ] = await Promise.all([
    db.merchant.count({ where: { status: "ACTIVE" } }),
    db.courier.count({ where: { status: "ACTIVE" } }),
    db.order.groupBy({ by: ["status"], where: { createdAt: { gte: d30 } }, _count: true }),
    db.order.aggregate({ where: { status: "DELIVERED", deliveredAt: { gte: d30 } }, _sum: { total: true }, _count: true }),
    db.order.aggregate({ where: { status: "DELIVERED", deliveredAt: { gte: prev30, lt: d30 } }, _sum: { total: true } }),
    db.codTransaction.aggregate({ where: { status: "AVAILABLE", type: "COD_COLLECTION", occurredAt: { gte: d30 } }, _sum: { amount: true } }),
    db.merchant.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    db.merchant.findMany({
      take: 6,
      orderBy: { orders: { _count: "desc" } },
      include: { _count: { select: { orders: true } } },
    }),
    db.order.findMany({
      where: { createdAt: { gte: new Date(now.getTime() - 29 * DAY) } },
      select: { createdAt: true, status: true },
    }),
    db.order.groupBy({ by: ["deliveryCity"], where: { createdAt: { gte: d30 } }, _count: true, orderBy: { _count: { deliveryCity: "desc" } }, take: 7 }),
  ]);

  const byStatus = Object.fromEntries(statusGroups.map((g) => [g.status, g._count]));
  const delivered30 = byStatus["DELIVERED"] ?? 0;
  const failed30 = byStatus["FAILED"] ?? 0;
  const returned30 = byStatus["RETURNED"] ?? 0;
  const total30 = statusGroups.reduce((a, g) => a + g._count, 0);
  const successRate = delivered30 + failed30 + returned30 > 0 ? delivered30 / (delivered30 + failed30 + returned30) : 0;
  const gmvDelta = (prevGmv._sum.total ?? 0) > 0 ? ((gmv._sum.total ?? 0) - (prevGmv._sum.total ?? 0)) / (prevGmv._sum.total ?? 1) : 0;

  const features = await getFeatureMap();
  const forecast = features.demand_forecast ? await forecastDemand() : [];
  const avgParcel = delivered30 > 0 ? (gmv._sum.total ?? 0) / delivered30 : 0;
  const series: { label: string; value: number }[] = [];
  const volumeSeries: { label: string; value: number }[] = [];
  for (let d = 29; d >= 0; d--) {
    const day = new Date(now.getTime() - d * DAY);
    const key = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const next = new Date(key.getTime() + DAY);
    const dayOrders = series30.filter((o) => o.createdAt >= key && o.createdAt < next);
    const dayDelivered = dayOrders.filter((o) => o.status === "DELIVERED").length;
    const label = `${key.getDate()}/${key.getMonth() + 1}`;
    series.push({ label, value: Math.round((dayDelivered * avgParcel) / DH) });
    volumeSeries.push({ label, value: dayOrders.length });
  }

  // ── Admin Pro Suite Data ──────────────────────────────────────
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // 1. Central Caisse Radar Data
  let caisseRadarData: CaisseRadarData | null = null;
  if (features.admin_central_caisse) {
    const [streetAgg, declaredAgg, declCount, vaultTodayAgg, merchantsPayAgg, pendingListRows] = await Promise.all([
      db.delivery.aggregate({
        where: { status: { in: ["IN_TRANSIT", "OUT_FOR_DELIVERY"] }, codCollected: { gt: 0 } },
        _sum: { codCollected: true },
      }),
      db.courierDeposit.aggregate({
        where: { status: "DECLARED" },
        _sum: { amount: true },
      }),
      db.courierDeposit.count({
        where: { status: "DECLARED" },
      }),
      db.courierDeposit.aggregate({
        where: { status: "VERIFIED", declaredAt: { gte: startOfToday } },
        _sum: { amount: true },
      }),
      db.merchant.aggregate({
        where: { walletBalance: { gt: 0 } },
        _sum: { walletBalance: true },
      }),
      db.courierDeposit.findMany({
        where: { status: "DECLARED" },
        include: {
          courier: { include: { user: { select: { name: true, phone: true } } } },
        },
        orderBy: { declaredAt: "desc" },
        take: 8,
      }),
    ]);
    caisseRadarData = {
      cashInStreet: streetAgg._sum.codCollected ?? 0,
      pendingCaisseDeposits: declaredAgg._sum.amount ?? 0,
      pendingDepositsCount: declCount,
      vaultCashToday: vaultTodayAgg._sum.amount ?? 0,
      merchantsPayable: merchantsPayAgg._sum.walletBalance ?? 0,
      pendingList: pendingListRows.map((d) => ({
        id: d.id,
        courierId: d.courierId,
        courierName: d.courier.user.name,
        courierPhone: d.courier.user.phone ?? "",
        amount: d.amount,
        expectedAmount: d.expectedAmount,
        difference: d.difference,
        declaredAt: d.declaredAt.toISOString(),
        note: d.note,
        proofPhoto: d.proofPhoto,
      })),
    };
  }

  // 2. Control Tower Data
  let controlTowerCouriers: CourierLiveInfo[] = [];
  const controlTowerAlerts: RiskAlert[] = [];
  if (features.admin_control_tower) {
    const activeList = await db.courier.findMany({
      where: { status: "ACTIVE" },
      include: {
        user: { select: { name: true, phone: true } },
        deliveries: {
          where: { updatedAt: { gte: startOfToday } },
          select: { status: true, codCollected: true },
        },
      },
      orderBy: { employeeCode: "asc" },
    });

    const { cashSummary } = await import("@/server/cash");
    controlTowerCouriers = await Promise.all(
      activeList.map(async (c) => {
        const summary = await cashSummary(c.id);
        const assigned = c.deliveries.length;
        const delivered = c.deliveries.filter((d) => d.status === "DELIVERED").length;
        return {
          id: c.id,
          name: c.user.name,
          phone: c.user.phone ?? "",
          code: c.employeeCode,
          city: c.homeCity,
          lat: c.lastLat,
          lng: c.lastLng,
          lastSeenAt: c.lastSeenAt?.toISOString() ?? null,
          assignedCount: assigned,
          deliveredCount: delivered,
          remainingCount: Math.max(0, assigned - delivered),
          cashInHand: summary.cashInHand,
        };
      })
    );

    controlTowerCouriers.forEach((c) => {
      if (c.cashInHand > 500000) {
        controlTowerAlerts.push({
          id: `cash-${c.id}`,
          type: "HIGH_CASH",
          title: `كاش مرتفع مع الموزع: ${c.name}`,
          desc: `يحمل ${(c.cashInHand / 100).toFixed(0)} DH — يُرجى توجيهه للإيداع في أقرب وكالة/خزينة`,
          time: "الآن",
          severity: "high",
        });
      }
      if (c.remainingCount > 0 && c.lastSeenAt && Date.now() - new Date(c.lastSeenAt).getTime() > 45 * 60000) {
        controlTowerAlerts.push({
          id: `idle-${c.id}`,
          type: "IDLE_COURIER",
          title: `توقف بدون تحديث: ${c.name}`,
          desc: `لم يُحدِّث موقعه منذ أكثر من 45 دقيقة وما زال بحوزته ${c.remainingCount} طرد`,
          time: "الآن",
          severity: "medium",
        });
      }
    });
  }

  // 3. Smart Dispatcher Data
  let smartDispatchStats: CityPendingDispatch[] = [];
  let smartDispatchTotal = 0;
  if (features.admin_smart_dispatch) {
    const unassignedOrders = await db.order.findMany({
      where: { status: { in: ["CONFIRMED", "READY_FOR_PICKUP"] }, courierId: null },
      select: { id: true, deliveryCity: true },
    });
    const couriers = await db.courier.findMany({
      where: { status: "ACTIVE" },
      select: { homeCity: true, zones: true },
    });

    const byCityMap: Record<string, number> = {};
    unassignedOrders.forEach((o) => {
      byCityMap[o.deliveryCity] = (byCityMap[o.deliveryCity] ?? 0) + 1;
    });

    smartDispatchStats = Object.entries(byCityMap).map(([city, count]) => {
      const avail = couriers.filter((c) => {
        try {
          const z = JSON.parse(c.zones) as string[];
          return c.homeCity === city || z.includes(city);
        } catch {
          return c.homeCity === city;
        }
      }).length;
      return {
        city,
        unassignedCount: count,
        availableCouriersCount: avail,
      };
    });
    smartDispatchTotal = unassignedOrders.length;
  }

  // 4. Anti-Return Risk Radar Data
  let riskRadarOrders: HighRiskOrder[] = [];
  if (features.admin_risk_radar) {
    const orders = await db.order.findMany({
      where: {
        status: { in: ["NEW", "CONFIRMED", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] },
        customer: { failedCount: { gte: 1 } },
      },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    riskRadarOrders = orders.map((o) => ({
      orderId: o.id,
      reference: o.reference,
      customerName: o.customer.fullName,
      customerPhone: o.customer.phone,
      city: o.deliveryCity,
      total: o.total,
      codAmount: o.codAmount,
      riskReason: o.customer.failedCount >= 2 ? "سوابق رفض متكررة (2+)" : "سجل إلغاء سابق",
      previousFailedCount: o.customer.failedCount,
      previousDeliveredCount: o.customer.totalOrders - o.customer.failedCount,
      riskLevel: o.customer.failedCount >= 2 ? "HIGH" : "MEDIUM",
    }));
  }

  return (
    <>
      <PageHeader
        title={i.t("admin.title")}
        subtitle={i.t("admin.subtitle")}
        actions={
          <Link href="/admin/settlements" className={buttonVariants({ variant: "outline" })}>
            <Banknote className="size-4" /> {i.t("nav.settlements")}
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={i.t("admin.gmv")} value={i.money(gmv._sum.total ?? 0, { compact: true })} delta={`${gmvDelta >= 0 ? "+" : "−"}${i.pct(Math.abs(gmvDelta))}`} deltaGood={gmvDelta >= 0} icon="Banknote" />
        <StatCard label={i.t("admin.deliveries")} value={i.num(total30)} icon="Truck" accent="var(--info)" hint="30 j" />
        <StatCard label={i.t("admin.successRate")} value={i.pct(successRate)} icon="PackageCheck" accent="var(--success)" />
        <StatCard label={i.t("admin.codCollected")} value={i.money(codAvailable._sum.amount ?? 0, { compact: true })} icon="Wallet" accent="var(--chart-5)" hint={i.t("status.AVAILABLE").toLowerCase()} />
        <StatCard label={i.t("admin.activeMerchants")} value={i.num(merchants)} icon="Building2" />
        <StatCard label={i.t("admin.couriersOnline")} value={i.num(activeCouriers)} icon="Bike" accent="var(--chart-3)" />
        <StatCard label={i.t("dashboard.failed")} value={i.num(failed30)} icon="AlertTriangle" accent="var(--error)" hint="30 j" />
        <StatCard label={i.t("returns.title")} value={i.num(returned30)} icon="Truck" accent="var(--chart-4)" hint="30 j" />
      </div>

      {/* ── 1. Central Caisse Radar ── */}
      {features.admin_central_caisse && caisseRadarData && (
        <div className="mt-4">
          <CentralCaisseRadar data={caisseRadarData} enabled={features.admin_central_caisse} />
        </div>
      )}

      {/* ── 2. Operations Control Tower (Live Fleet Map & Risk Alerts) ── */}
      {features.admin_control_tower && (
        <div className="mt-4">
          <ControlTower couriers={controlTowerCouriers} alerts={controlTowerAlerts} enabled={features.admin_control_tower} />
        </div>
      )}

      {/* ── 3. Smart Dispatcher (Morning Auto-Cluster) ── */}
      {features.admin_smart_dispatch && (
        <div className="mt-4">
          <SmartDispatcher
            cityStats={smartDispatchStats}
            totalUnassigned={smartDispatchTotal}
            enabled={features.admin_smart_dispatch}
          />
        </div>
      )}

      {/* ── 4. AI Anti-Return & High-Risk Customer Radar ── */}
      {features.admin_risk_radar && (
        <div className="mt-4">
          <RiskRadar orders={riskRadarOrders} enabled={features.admin_risk_radar} />
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartCard title={i.t("admin.gmvTrend")} className="lg:col-span-2">
          <AreaTrend data={series} height={250} color="var(--chart-1)" />
        </ChartCard>
        <ChartCard title={i.t("admin.health")}>
          <p className="text-[13px] text-muted-foreground">{i.t("admin.healthDesc")}</p>
          <ul className="mt-3 space-y-2.5">
            <HealthRow label={i.t("admin.slaOk")} ok />
            <HealthRow label={`${i.num(merchants)} ${i.t("nav.merchants").toLowerCase()} · ${i.num(activeCouriers)} ${i.t("nav.couriers").toLowerCase()}`} ok />
            <HealthRow label={`${i.money(codAvailable._sum.amount ?? 0, { compact: true })} ${i.t("wallet.pendingCod").toLowerCase()}`} ok={codAvailable._sum.amount! < 50000000} />
          </ul>
          <div className="mt-4">
            <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">{i.t("admin.topMerchants")}</p>
            <HorizontalBars data={topMerchants.map((m) => ({ label: m.name.split(" ")[0], value: m._count.orders }))} color="var(--chart-5)" height={170} />
          </div>
        </ChartCard>
      </div>

      {forecast.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[13.5px] font-semibold">
              <TrendIcon className="size-4 text-primary" /> {i.t("admin.forecast.title")}
            </h3>
            <p className="text-[11.5px] text-faint">{i.t("admin.forecast.desc")}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {forecast.slice(0, 5).map((f) => (
              <div key={f.city} className={`rounded-xl border p-3 ${f.peak ? "border-warning/30 bg-warning-soft" : "border-border bg-surface-2"}`}>
                <p className="flex items-center justify-between text-[12px] font-medium text-muted-foreground">
                  {f.city}
                  {f.peak && <span className="rounded bg-warning/15 px-1 py-0.5 text-[9.5px] font-bold text-warning">{i.t("admin.forecast.peak")}</span>}
                </p>
                <p className="mt-1 text-[20px] font-semibold tnum">{i.num(f.tomorrow)}</p>
                <p className="text-[11px] text-faint">
                  {i.t("admin.forecast.suggest")} : <strong className="text-foreground">{f.suggestedCouriers}</strong> · {i.t("status.ACTIVE")} : {f.couriersActive}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface shadow-xs">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-[13.5px] font-semibold">{i.t("admin.recentMerchants")}</h3>
          </div>
          <ul>
            {recentMerchants.map((m) => (
              <li key={m.id}>
                <Link href={`/admin/merchants/${m.id}`} className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 transition-colors last:border-0 hover:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{m.name}</p>
                    <p className="text-[12px] text-muted-foreground">{m.city} · {i.rel(m.createdAt)}</p>
                  </div>
                  <StatusBadge status={m.status} size="sm" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <ChartCard title={i.t("analytics.byCity")}>
          <HorizontalBars data={cityRows.map((c) => ({ label: c.deliveryCity, value: c._count }))} />
        </ChartCard>
      </div>
    </>
  );
}

function HealthRow({ label, ok }: { label: string; ok: boolean }) {
  const { t } = { t: (k: string) => k };
  return (
    <li className="flex items-center gap-2.5 text-[13px]">
      <CheckCircle2 className="size-4 shrink-0" style={{ color: ok ? "var(--success)" : "var(--warning)" }} />
      <span>{label}</span>
    </li>
  );
}
