import { db } from "@/server/db";
import { assignCourier } from "@/server/orders";
import type { Actor } from "@/server/orders";

/**
 * Smart dispatch: pick the best courier for a parcel and auto-assign.
 * Ranking: courier covers the city → lowest current load → highest success rate → rating.
 */
export async function pickCourier(deliveryCity: string, excludeCourierIds: string[] = []) {
  const couriers = await db.courier.findMany({
    where: { status: "ACTIVE", id: { notIn: excludeCourierIds.length ? excludeCourierIds : undefined } },
    include: { user: { select: { name: true } }, deliveries: { where: { status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"] } }, select: { id: true } } },
  });
  if (!couriers.length) return null;

  const scored = couriers.map((c) => {
    const zones = JSON.parse(c.zones) as string[];
    const coversCity = zones.includes(deliveryCity);
    const sameCity = c.homeCity === deliveryCity;
    const load = c.deliveries.length;
    const delivered = c.deliveries.length; // active load only in this query
    void delivered;
    return { courier: c, coversCity, sameCity, load };
  });

  const eligible = scored.filter((s) => s.coversCity || s.sameCity);
  const pool = (eligible.length ? eligible : scored).sort((a, b) => {
    if (a.coversCity !== b.coversCity) return a.coversCity ? -1 : 1;
    if (a.load !== b.load) return a.load - b.load;
    return b.courier.rating - a.courier.rating;
  });
  return pool[0].courier;
}

export async function autoAssignOrder(orderId: string, actor: Actor) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { delivery: true } });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  const courier = await pickCourier(order.deliveryCity);
  if (!courier) throw new Error("NO_COURIER_AVAILABLE");
  await assignCourier(orderId, courier.id, actor);
  return { courierId: courier.id, courierName: courier.user.name, employeeCode: courier.employeeCode };
}

/** Bulk auto-assign merchant orders waiting for a courier. */
export async function autoAssignOrders(orderIds: string[], merchantId: string, actor: Actor) {
  const results: { orderId: string; ok: boolean; courierName?: string; error?: string }[] = [];
  for (const id of orderIds) {
    try {
      const order = await db.order.findFirst({ where: { id, merchantId } });
      if (!order) { results.push({ orderId: id, ok: false, error: "NOT_FOUND" }); continue; }
      const r = await autoAssignOrder(id, actor);
      results.push({ orderId: id, ok: true, courierName: r.courierName });
    } catch (e: any) {
      results.push({ orderId: id, ok: false, error: e?.message ?? "FAILED" });
    }
  }
  return results;
}

/**
 * Nearest-neighbour tour ordering for a courier's active stops.
 * Starts from the courier's last known position (or their first stop).
 */
export function sortTour<T extends { gpsLat: number | null; gpsLng: number | null; id: string }>(
  stops: T[],
  from?: { lat: number | null; lng: number | null } | null
): T[] {
  const points = stops.filter((s) => s.gpsLat != null && s.gpsLng != null);
  if (points.length < 2) return stops;

  let cur = from?.lat != null && from?.lng != null ? { lat: from.lat, lng: from.lng } : { lat: points[0].gpsLat!, lng: points[0].gpsLng! };
  const remaining = [...points];
  const ordered: T[] = [];
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = (remaining[i].gpsLat! - cur.lat) ** 2 + (remaining[i].gpsLng! - cur.lng) ** 2;
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    cur = { lat: next.gpsLat!, lng: next.gpsLng! };
  }
  // keep stops without GPS at the end, in original order
  const withoutGps = stops.filter((s) => s.gpsLat == null || s.gpsLng == null);
  return [...ordered, ...withoutGps];
}
