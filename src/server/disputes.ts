import { db } from "@/server/db";
import { badRequest, notFound } from "@/lib/api";
import { recalcWallet } from "@/server/orders";
import { audit } from "@/server/audit";

/**
 * Disputes (litiges): merchants open a claim on damaged / lost / wrong
 * parcels; admins resolve with optional wallet compensation.
 */
export async function openDispute(input: { orderId: string; merchantId: string; type: string; description: string; actor: { id?: string; name: string } }) {
  const order = await db.order.findFirst({ where: { id: input.orderId, merchantId: input.merchantId } });
  if (!order) throw notFound("Order not found");
  const existing = await db.dispute.findFirst({ where: { orderId: order.id, status: { in: ["OPEN", "UNDER_REVIEW"] } } });
  if (existing) throw badRequest("A dispute is already open for this order");
  const dispute = await db.dispute.create({
    data: { orderId: order.id, merchantId: input.merchantId, type: input.type, description: input.description },
  });
  await db.orderEvent.create({
    data: { orderId: order.id, type: "NOTE", actorType: "MERCHANT", actorName: input.actor.name, message: `Litige ouvert (${input.type})` },
  });
  await audit({ actorId: input.actor.id, actorName: input.actor.name, actorType: "MERCHANT", action: "DISPUTE_OPENED", entity: "Dispute", entityId: dispute.id });
  return dispute;
}

export async function resolveDispute(
  disputeId: string,
  outcome: "RESOLVED" | "REJECTED",
  resolution: string,
  compensationCentimes: number,
  actor: { id: string; name: string }
) {
  const dispute = await db.dispute.findUnique({ where: { id: disputeId } });
  if (!dispute) throw notFound("Dispute not found");
  if (dispute.status === "RESOLVED" || dispute.status === "REJECTED") throw badRequest("Dispute is already closed");

  await db.dispute.update({
    where: { id: disputeId },
    data: {
      status: outcome,
      resolution,
      compensation: outcome === "RESOLVED" ? compensationCentimes : 0,
      resolvedAt: new Date(),
      resolvedBy: actor.name,
    },
  });
  if (outcome === "RESOLVED" && compensationCentimes > 0) {
    await db.codTransaction.create({
      data: {
        merchantId: dispute.merchantId, orderId: dispute.orderId, type: "ADJUSTMENT",
        amount: compensationCentimes, status: "AVAILABLE",
        description: `Compensation litige ${dispute.id.slice(-6).toUpperCase()}`, occurredAt: new Date(),
      },
    });
    await recalcWallet(dispute.merchantId);
  }
  await db.orderEvent.create({
    data: { orderId: dispute.orderId, type: "NOTE", actorType: "ADMIN", actorName: actor.name, message: `Litige ${outcome === "RESOLVED" ? "résolu" : "rejeté"} : ${resolution}` },
  });
  await audit({ actorId: actor.id, actorName: actor.name, actorType: "ADMIN", action: `DISPUTE_${outcome}`, entity: "Dispute", entityId: disputeId, meta: resolution });
  return { ok: true };
}
