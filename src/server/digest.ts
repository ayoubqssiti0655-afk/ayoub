import { db } from "@/server/db";
import { DH } from "@/lib/utils";

/**
 * Daily merchant digest — "what happened today" summary, delivered as a
 * WhatsApp notification + in-app, with a preview card on the dashboard.
 */
export type Digest = {
  date: string;
  newOrders: number;
  delivered: number;
  failed: number;
  codCollected: number;
  pendingConfirm: number;
  newReturns: number;
};

export async function buildDigest(merchantId: string): Promise<Digest> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [newOrders, delivered, failed, codAgg, pendingConfirm, newReturns] = await Promise.all([
    db.order.count({ where: { merchantId, createdAt: { gte: startOfToday } } }),
    db.order.count({ where: { merchantId, status: "DELIVERED", deliveredAt: { gte: startOfToday } } }),
    db.order.count({ where: { merchantId, status: "FAILED", failedAt: { gte: startOfToday } } }),
    db.codTransaction.aggregate({ where: { merchantId, type: "COD_COLLECTION", occurredAt: { gte: startOfToday } }, _sum: { amount: true } }),
    db.order.count({ where: { merchantId, status: "NEW" } }),
    db.return.count({ where: { merchantId, requestedAt: { gte: startOfToday } } }),
  ]);

  return {
    date: startOfToday.toISOString().slice(0, 10),
    newOrders, delivered, failed,
    codCollected: codAgg._sum.amount ?? 0,
    pendingConfirm, newReturns,
  };
}

export function digestText(d: Digest): string {
  const money = (c: number) => `${(c / DH).toFixed(0)} DH`;
  return `📅 Rapport du ${d.date}\n• ${d.newOrders} nouvelle(s) commande(s)\n• ${d.delivered} livrée(s) ✓\n• ${d.failed} échec(s) ✕\n• ${d.newReturns} retour(s)\n• COD encaissé : ${money(d.codCollected)}\n• ${d.pendingConfirm} commande(s) à confirmer`;
}

/** Send the digest to all merchant staff (WhatsApp channel, logged). */
export async function sendDigest(merchantId: string) {
  const d = await buildDigest(merchantId);
  const staff = await db.merchantStaff.findMany({ where: { merchantId }, select: { userId: true } });
  const merchant = await db.merchant.findUnique({ where: { id: merchantId }, select: { name: true } });
  const body = digestText(d);
  for (const s of staff) {
    await db.notification.create({
      data: {
        userId: s.userId, merchantId, type: "SYSTEM",
        title: `Rapport quotidien — ${merchant?.name ?? ""}`,
        body, channel: "WHATSAPP",
      },
    });
  }
  return d;
}
