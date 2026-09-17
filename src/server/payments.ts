import { db } from "@/server/db";
import { isFeatureEnabled, FEATURE_DISABLED_MSG } from "@/server/features";
import { forbidden } from "@/lib/api";
import { badRequest, notFound } from "@/lib/api";
import { notifyMerchant, fireWebhooks } from "@/server/notifications";
import { audit } from "@/server/audit";
import { sendCustomerWhatsApp, trackingUrl } from "@/server/whatsapp";

/**
 * Payment provider abstraction. `CmiProvider` simulates CMI (Centre Monétique
 * Interbancaire) card payments so COD parcels can be prepaid from the tracking
 * page. Swap `charge()` with CMI's redirect/verify flow (or Payzone) — the
 * order-side accounting below stays identical.
 */

export interface PaymentProvider {
  readonly id: string;
  charge(input: { reference: string; amount: number; card: { number: string; exp: string; cvc: string } }): Promise<{ transactionId: string; ok: boolean }>;
}

export const cmiProvider: PaymentProvider = {
  id: "CMI",
  async charge({ reference, amount, card }) {
    // Simulation: basic card sanity checks, then generate a CMI-style transaction id.
    const digits = card.number.replace(/\s/g, "");
    if (digits.length < 12 || !/^\d{2}\/\d{2}$/.test(card.exp) || !/^\d{3,4}$/.test(card.cvc)) {
      return { ok: false, transactionId: "" };
    }
    const transactionId = `CMI-SIM-${Date.now().toString(36).toUpperCase()}-${Math.floor(amount)}`;
    console.log(`[cmi] simulated charge ${reference}: ${(amount / 100).toFixed(2)} MAD → ${transactionId}`);
    return { ok: true, transactionId };
  },
};

export async function payOrderOnline(reference: string, card: { number: string; exp: string; cvc: string }) {
  if (!(await isFeatureEnabled("online_payment"))) throw forbidden(FEATURE_DISABLED_MSG);
  const order = await db.order.findUnique({ where: { reference }, include: { customer: true, merchant: true } });
  if (!order) throw notFound("Order not found");
  if (order.status === "CANCELLED") throw badRequest("Order is cancelled");
  if (order.paymentMethod === "PREPAID") throw badRequest("Order is already paid");
  if (["DELIVERED", "RETURNED"].includes(order.status)) throw badRequest("Order is already finalized");

  const result = await cmiProvider.charge({ reference, amount: order.total, card });
  if (!result.ok) throw badRequest("Card declined — check the card details");

  const now = new Date();
  await db.order.update({
    where: { id: order.id },
    data: { paymentMethod: "PREPAID", codAmount: 0, updatedAt: now },
  });
  const payment = await db.payment.findFirst({ where: { orderId: order.id } });
  if (payment) {
    await db.payment.update({
      where: { id: payment.id },
      data: { method: "PREPAID", status: "COLLECTED", collectedAt: now },
    });
  } else {
    await db.payment.create({ data: { orderId: order.id, method: "PREPAID", amount: order.total, status: "COLLECTED", collectedAt: now } });
  }
  await db.orderEvent.create({
    data: { orderId: order.id, type: "NOTE", actorType: "SYSTEM", actorName: "CMI", message: `Paiement en ligne ${result.transactionId} — ${(order.total / 100).toFixed(2)} DH` },
  });
  // ledger: record the collection immediately (money is in)
  await db.codTransaction.create({
    data: { merchantId: order.merchantId, orderId: order.id, type: "COD_COLLECTION", amount: order.total, status: "AVAILABLE", description: `Paiement en ligne ${order.reference} (${result.transactionId})`, occurredAt: now },
  });
  const { recalcWallet } = await import("@/server/orders");
  await recalcWallet(order.merchantId);

  await sendCustomerWhatsApp({
    template: "PAID_ONLINE",
    phone: order.customer.phone,
    merchantId: order.merchantId,
    orderId: order.id,
    input: {
      customerName: order.customer.fullName,
      reference: order.reference,
      merchantName: order.merchant.name,
      trackingUrl: trackingUrl(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000", order.reference),
      amount: `${(order.total / 100).toFixed(2)} DH`,
      supportPhone: "+212 5 22 00 00 00",
    },
  });
  fireWebhooks(order.merchantId, "order.confirmed", { reference, paid_online: true, transaction: result.transactionId });
  await audit({ actorName: "CMI", actorType: "SYSTEM", action: "ORDER_PAID_ONLINE", entity: "Order", entityId: order.id, meta: result.transactionId });

  return { transactionId: result.transactionId, amount: order.total };
}
