import { db } from "@/server/db";

const DAY = 86400000;

export type Anomaly = {
  severity: "high" | "medium";
  title: string;
  detail: string;
  href: string;
};

/**
 * Anomaly radar for admin: detects sudden operational degradations over the
 * last 7 days vs the previous 7 — courier failure spikes, city failure spikes,
 * silent merchants, stuck parcels.
 */
export async function detectAnomalies(): Promise<Anomaly[]> {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * DAY);
  const d14 = new Date(now.getTime() - 14 * DAY);
  const out: Anomaly[] = [];

  // 1. courier failure-rate spike
  const couriers = await db.courier.findMany({
    where: { status: "ACTIVE" },
    include: {
      user: { select: { name: true } },
      deliveries: {
        where: { updatedAt: { gte: d14 } },
        select: { status: true, updatedAt: true },
      },
    },
  });
  for (const c of couriers) {
    const recent = c.deliveries.filter((d) => d.updatedAt >= d7 && ["FAILED", "DELIVERED"].includes(d.status));
    const prev = c.deliveries.filter((d) => d.updatedAt < d7 && d.updatedAt >= d14 && ["FAILED", "DELIVERED"].includes(d.status));
    const rFail = recent.filter((d) => d.status === "FAILED").length;
    const rTot = recent.length;
    const pFail = prev.filter((d) => d.status === "FAILED").length;
    const pTot = prev.length;
    if (rTot >= 8 && rFail / rTot >= 0.4 && rFail > pFail * 2 + 2) {
      out.push({
        severity: "high",
        title: `Dégradation livreur : ${c.user.name}`,
        detail: `${rFail}/${rTot} échecs cette semaine (${Math.round((rFail / rTot) * 100)} %) vs ${pFail}/${pTot} la semaine passée.`,
        href: `/admin/couriers/${c.id}`,
      });
    }
  }

  // 2. city failure spike
  const cityRecent = await db.order.groupBy({
    by: ["deliveryCity"],
    where: { status: "FAILED", updatedAt: { gte: d7 } },
    _count: true,
  });
  const cityPrev = await db.order.groupBy({
    by: ["deliveryCity"],
    where: { status: "FAILED", updatedAt: { gte: d14, lt: d7 } },
    _count: true,
  });
  const prevMap = new Map(cityPrev.map((c) => [c.deliveryCity, c._count]));
  for (const c of cityRecent) {
    if (c._count >= 5 && c._count >= (prevMap.get(c.deliveryCity) ?? 0) * 2 + 2) {
      out.push({
        severity: "medium",
        title: `Hausse des échecs à ${c.deliveryCity}`,
        detail: `${c._count} échecs cette semaine (vs ${prevMap.get(c.deliveryCity) ?? 0} la semaine passée).`,
        href: `/admin/orders?status=FAILED&city=${encodeURIComponent(c.deliveryCity)}`,
      });
    }
  }

  // 3. silent merchant (active, had orders, none in 14 days)
  const merchants = await db.merchant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, orders: { where: { createdAt: { gte: d14 } }, select: { id: true } }, _count: { select: { orders: true } } },
  });
  for (const m of merchants) {
    if (m._count.orders >= 10 && m.orders.length === 0) {
      out.push({
        severity: "medium",
        title: `Marchand silencieux : ${m.name}`,
        detail: `${m._count.orders} commandes au total, aucune depuis 14 jours. Un appel de rétention ?`,
        href: `/admin/merchants/${m.id}`,
      });
    }
  }

  // 4. stuck parcels (assigned but untouched for 3+ days)
  const stuck = await db.delivery.count({
    where: { status: { in: ["ASSIGNED", "PICKED_UP"] }, updatedAt: { lt: new Date(now.getTime() - 3 * DAY) } },
  });
  if (stuck >= 3) {
    out.push({
      severity: "high",
      title: `${stuck} colis bloqués`,
      detail: "Des colis sont assignés sans mouvement depuis 3 jours ou plus.",
      href: "/admin/deliveries",
    });
  }

  return out.slice(0, 8);
}
