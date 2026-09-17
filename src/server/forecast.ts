import { db } from "@/server/db";

const DAY = 86400000;

export type CityForecast = { city: string; avgDaily: number; tomorrow: number; peak: boolean; couriersActive: number; suggestedCouriers: number };

/**
 * Demand forecast for admin staffing: moving average per city over the last
 * 4 same-weekdays (captures the weekly seasonality), a naive trend factor,
 * and a recommended courier count at 12 parcels/courier/day.
 */
export async function forecastDemand(): Promise<CityForecast[]> {
  const now = new Date();
  const since = new Date(now.getTime() - 28 * DAY);
  const orders = await db.order.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, deliveryCity: true },
  });
  const couriers = await db.courier.findMany({ where: { status: "ACTIVE" }, select: { homeCity: true } });

  const byCity: Record<string, Record<string, number>> = {}; // last 28 days daily counts
  for (const o of orders) {
    const key = new Date(o.createdAt.getFullYear(), o.createdAt.getMonth(), o.createdAt.getDate()).toISOString().slice(0, 10);
    byCity[o.deliveryCity] = byCity[o.deliveryCity] ?? {};
    byCity[o.deliveryCity][key] = (byCity[o.deliveryCity][key] ?? 0) + 1;
  }

  const out: CityForecast[] = [];
  const tomorrowDow = new Date(now.getTime() + DAY).getDay();
  for (const [city, days] of Object.entries(byCity)) {
    const counts = Object.values(days);
    const avgDaily = counts.reduce((a, b) => a + b, 0) / Math.max(1, counts.length);
    // same weekday history (last 4 weeks)
    const sameDow: number[] = [];
    for (let w = 1; w <= 4; w++) {
      const d = new Date(now.getTime() + DAY - w * 7 * DAY);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
      if (days[key] != null) sameDow.push(days[key]);
    }
    const dowAvg = sameDow.length ? sameDow.reduce((a, b) => a + b, 0) / sameDow.length : avgDaily;
    const tomorrow = Math.round(dowAvg * 1.08); // +8% gentle growth assumption
    const couriersActive = couriers.filter((c) => c.homeCity === city).length;
    const suggestedCouriers = Math.max(1, Math.ceil(tomorrow / 12));
    out.push({ city, avgDaily: Math.round(avgDaily * 10) / 10, tomorrow, peak: tomorrow > avgDaily * 1.25, couriersActive, suggestedCouriers });
  }
  return out.sort((a, b) => b.tomorrow - a.tomorrow).slice(0, 10);
}
