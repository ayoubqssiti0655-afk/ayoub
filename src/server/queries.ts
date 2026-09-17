import { db } from "@/server/db";
import { ACTIVE_STATUSES } from "@/lib/constants";
import { DH } from "@/lib/utils";

const DAY = 86400000;

export type DashboardStats = Awaited<ReturnType<typeof getMerchantDashboard>>;

export async function getMerchantDashboard(merchantId: string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday.getTime() - 6 * DAY);
  const d30 = new Date(now.getTime() - 30 * DAY);
  const prev30 = new Date(now.getTime() - 60 * DAY);

  const [todayCount, weekCount, statusGroups, activeGroups, revenueAgg, prevRevenueAgg, codAgg, recent, events] = await Promise.all([
    db.order.count({ where: { merchantId, createdAt: { gte: startOfToday } } }),
    db.order.count({ where: { merchantId, createdAt: { gte: startOfWeek } } }),
    db.order.groupBy({ by: ["status"], where: { merchantId, createdAt: { gte: d30 } }, _count: true }),
    db.order.groupBy({ by: ["status"], where: { merchantId, status: { in: ACTIVE_STATUSES }, createdAt: { gte: new Date(now.getTime() - 7 * DAY) } }, _count: true }),
    db.order.aggregate({ where: { merchantId, status: "DELIVERED", deliveredAt: { gte: d30 } }, _sum: { total: true }, _count: true }),
    db.order.aggregate({ where: { merchantId, status: "DELIVERED", deliveredAt: { gte: prev30, lt: d30 } }, _sum: { total: true }, _count: true }),
    db.codTransaction.groupBy({ by: ["type"], where: { merchantId, status: "AVAILABLE" }, _sum: { amount: true } }),
    db.order.findMany({
      where: { merchantId },
      include: { customer: { select: { fullName: true, phone: true } }, courier: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 7,
    }),
    db.orderEvent.findMany({
      where: { order: { merchantId }, type: { in: ["DELIVERED", "FAILED", "CREATED", "RETURNED", "ATTEMPT"] } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { order: { select: { reference: true } } },
    }),
  ]);

  const byStatus = Object.fromEntries(statusGroups.map((g) => [g.status, g._count]));
  const active = Object.fromEntries(activeGroups.map((g) => [g.status, g._count]));

  const delivered30 = byStatus["DELIVERED"] ?? 0;
  const failed30 = byStatus["FAILED"] ?? 0;
  const returned30 = byStatus["RETURNED"] ?? 0;
  const total30 = statusGroups.reduce((a, g) => a + g._count, 0);
  const successRate = total30 > 0 ? delivered30 / (delivered30 + failed30 + returned30 || 1) : 0;

  const cod = Object.fromEntries(codAgg.map((g) => [g.type, g._sum.amount ?? 0]));

  // 30-day series (orders + revenue)
  const since = new Date(now.getTime() - 29 * DAY);
  const orders = await db.order.findMany({
    where: { merchantId, createdAt: { gte: new Date(since.getFullYear(), since.getMonth(), since.getDate()) } },
    select: { createdAt: true, total: true, status: true, deliveredAt: true },
  });
  const series: { label: string; value: number; secondary: number }[] = [];
  const revenueSeries: { label: string; value: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now.getTime() - i * DAY);
    const key = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const next = new Date(key.getTime() + DAY);
    const dayOrders = orders.filter((o) => o.createdAt >= key && o.createdAt < next);
    const deliveredRev = orders
      .filter((o) => o.deliveredAt && o.deliveredAt >= key && o.deliveredAt < next)
      .reduce((a, o) => a + o.total, 0);
    series.push({ label: `${key.getDate()}/${key.getMonth() + 1}`, value: dayOrders.length, secondary: dayOrders.filter((o) => o.status === "FAILED").length });
    revenueSeries.push({ label: `${key.getDate()}/${key.getMonth() + 1}`, value: Math.round(deliveredRev / DH) });
  }

  const topCities = await db.order.groupBy({
    by: ["deliveryCity"],
    where: { merchantId, createdAt: { gte: d30 } },
    _count: true,
    orderBy: { _count: { deliveryCity: "desc" } },
    take: 6,
  });

  // avg delivery time (delivered, last 30d)
  const deliveredRecent = await db.order.findMany({
    where: { merchantId, status: "DELIVERED", deliveredAt: { gte: d30 } },
    select: { createdAt: true, deliveredAt: true },
    take: 500,
  });
  const avgHours = deliveredRecent.length
    ? deliveredRecent.reduce((a, o) => a + (o.deliveredAt!.getTime() - o.createdAt.getTime()), 0) / deliveredRecent.length / 3600000
    : 0;

  const pendingSettle = await db.codTransaction.count({ where: { merchantId, type: "COD_COLLECTION", status: "AVAILABLE" } });

  return {
    todayCount,
    weekCount,
    counts: {
      delivered: delivered30,
      failed: failed30,
      returned: returned30,
      total30,
      new: active["NEW"] ?? 0,
      confirmed: active["CONFIRMED"] ?? 0,
      ready: active["READY_FOR_PICKUP"] ?? 0,
      inTransit: (active["PICKED_UP"] ?? 0) + (active["IN_TRANSIT"] ?? 0),
      outForDelivery: active["OUT_FOR_DELIVERY"] ?? 0,
    },
    revenue30: revenueAgg._sum.total ?? 0,
    prevRevenue30: prevRevenueAgg._sum.total ?? 0,
    deliveredCount30: revenueAgg._count,
    prevDeliveredCount30: prevRevenueAgg._count,
    successRate,
    codCollected: cod["COD_COLLECTION"] ?? 0,
    codFees: (cod["DELIVERY_FEE"] ?? 0) + (cod["RETURN_FEE"] ?? 0),
    series,
    revenueSeries,
    recent,
    events,
    topCities: topCities.map((c) => ({ label: c.deliveryCity, value: c._count })),
    avgHours,
    pendingSettle,
  };
}

// ── Orders list query (shared by merchant orders page) ────────────
export type OrderListParams = {
  merchant?: string;
  q?: string;
  status?: string;
  city?: string;
  courier?: string;
  from?: string;
  to?: string;
  sort?: string;
  page?: number;
  per?: number;
};

export async function listOrders(merchantId: string | null, params: OrderListParams) {
  const where: any = {};
  if (merchantId) where.merchantId = merchantId;
  if (params.merchant) where.merchantId = params.merchant;
  if (params.status && params.status !== "ALL") where.status = params.status;
  if (params.city && params.city !== "ALL") where.deliveryCity = params.city;
  if (params.courier && params.courier !== "ALL") where.courierId = params.courier;
  if (params.q) {
    where.OR = [
      { reference: { contains: params.q } },
      { customer: { fullName: { contains: params.q } } },
      { customer: { phone: { contains: params.q } } },
      { deliveryAddress: { contains: params.q } },
    ];
  }
  if (params.from || params.to) {
    where.createdAt = {};
    if (params.from) where.createdAt.gte = new Date(params.from);
    if (params.to) where.createdAt.lte = new Date(params.to + "T23:59:59");
  }
  const per = Math.min(50, Math.max(10, params.per ?? 20));
  const page = Math.max(1, params.page ?? 1);
  const sortMap: Record<string, any> = {
    newest: { createdAt: "desc" },
    oldest: { createdAt: "asc" },
    amount_desc: { total: "desc" },
    amount_asc: { total: "asc" },
    status: { status: "asc" },
  };
  const orderBy = sortMap[params.sort ?? "newest"] ?? sortMap.newest;

  const [total, rows] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      include: {
        customer: { select: { fullName: true, phone: true } },
        courier: { include: { user: { select: { name: true } } } },
      },
      orderBy,
      skip: (page - 1) * per,
      take: per,
    }),
  ]);
  return { total, rows, page, per, totalPages: Math.max(1, Math.ceil(total / per)) };
}

export async function getMerchantCities(merchantId: string | null) {
  const rows = await db.order.groupBy({
    by: ["deliveryCity"],
    where: merchantId ? { merchantId } : {},
    _count: true,
    orderBy: { _count: { deliveryCity: "desc" } },
  });
  return rows.map((r) => r.deliveryCity);
}
