import { db } from "@/server/db";
import { ApiError, badRequest, notFound, forbidden } from "@/lib/api";
import { ORDER_TRANSITIONS, isTerminal } from "@/lib/constants";
import { quoteDelivery } from "@/server/pricing";
import { notify, notifyMerchant, fireWebhooks } from "@/server/notifications";
import { audit } from "@/server/audit";
import { sendCustomerWhatsApp, trackingUrl } from "@/server/whatsapp";
import { isFeatureEnabled } from "@/server/features";

export type Actor = { id?: string; name: string; type: "MERCHANT" | "COURIER" | "ADMIN" | "SYSTEM" | "API" };

async function customerWhatsApp(
  template: "DELIVERED" | "FAILED",
  order: { id: string; reference: string; merchantId: string },
  customer: { fullName: string; phone: string },
  merchantName: string,
  extra?: { nextDate?: string }
) {
  await sendCustomerWhatsApp({
    template,
    phone: customer.phone,
    merchantId: order.merchantId,
    orderId: order.id,
    input: {
      customerName: customer.fullName,
      reference: order.reference,
      merchantName,
      trackingUrl: trackingUrl(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000", order.reference),
      supportPhone: "+212 5 22 00 00 00",
      ...extra,
    },
  });
}

async function orderCustomer(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { customer: { select: { fullName: true, phone: true } }, merchant: { select: { name: true } } },
  });
  return order;
}

function newRef() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `MSR-${s}`;
}

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Create order ──────────────────────────────────────────────────
export type CreateOrderInput = {
  merchantId: string;
  customer: {
    id?: string;
    fullName: string;
    phone: string;
    secondaryPhone?: string;
    city: string; // City.nameFr
    address: string;
    postalCode?: string;
    notes?: string;
  };
  items: { productId?: string; name: string; sku?: string; quantity: number; unitPrice: number }[];
  shippingFee?: number;
  discount?: number;
  paymentMethod?: "COD" | "PREPAID";
  notes?: string;
  source?: string;
  exchangeFor?: string;
};

// ── Stock management ────────────────────────────────────────────
export async function deductStock(items: CreateOrderInput["items"]) {
  for (const it of items) {
    if (!it.productId) continue;
    const product = await db.product.findUnique({ where: { id: it.productId } });
    if (!product) continue;
    await db.product.update({ where: { id: it.productId }, data: { stock: Math.max(0, product.stock - it.quantity) } });
  }
}

export async function restockItems(orderId: string) {
  if (!(await isFeatureEnabled("stock_management"))) return;
  const items = await db.orderItem.findMany({ where: { orderId, productId: { not: null } } });
  for (const it of items) {
    if (!it.productId) continue;
    await db.product.update({ where: { id: it.productId }, data: { stock: { increment: it.quantity } } });
  }
}

export async function createOrder(input: CreateOrderInput) {
  if (!input.items.length) throw badRequest("An order needs at least one item");
  if (await isFeatureEnabled("stock_management")) {
    for (const it of input.items) {
      if (!it.productId) continue;
      const p = await db.product.findUnique({ where: { id: it.productId }, select: { stock: true, name: true } });
      if (p && p.stock < it.quantity) throw badRequest(`Stock insuffisant pour ${p.name} (${p.stock} restant)`);
    }
  }
  if (await isFeatureEnabled("stock_management")) await deductStock(input.items);
  if (await isFeatureEnabled("stock_management")) {
    for (const it of input.items) {
      if (!it.productId) continue;
      const p = await db.product.findUnique({ where: { id: it.productId }, select: { stock: true, name: true } });
      if (p && p.stock < it.quantity) throw badRequest();
    }
  }
  await deductStock(input.items);
  const quote = await quoteDelivery({ cityFr: input.customer.city });
  const itemsTotal = input.items.reduce((a, i) => a + i.quantity * i.unitPrice, 0);
  if (itemsTotal <= 0) throw badRequest("Order total must be positive");
  const shippingFee = input.shippingFee ?? quote.total;
  const discount = input.discount ?? 0;
  const total = itemsTotal + shippingFee - discount;
  const paymentMethod = input.paymentMethod ?? "COD";
  const codAmount = paymentMethod === "COD" ? total : 0;

  // upsert customer by (merchant, phone)
  let customerId = input.customer.id;
  if (!customerId) {
    const existing = await db.customer.findUnique({
      where: { merchantId_phone: { merchantId: input.merchantId, phone: input.customer.phone } },
    });
    if (existing) customerId = existing.id;
    else {
      const created = await db.customer.create({
        data: {
          merchantId: input.merchantId,
          fullName: input.customer.fullName,
          phone: input.customer.phone,
          secondaryPhone: input.customer.secondaryPhone,
          city: input.customer.city,
          address: input.customer.address,
          notes: input.customer.notes,
        },
      });
      customerId = created.id;
    }
  }

  const eta = new Date(Date.now() + quote.etaHours * 3600000);
  const order = await db.order.create({
    data: {
      reference: newRef(),
      merchantId: input.merchantId,
      customerId: customerId!,
      status: "NEW",
      paymentMethod,
      source: input.source ?? "DASHBOARD",
      itemsTotal,
      shippingFee,
      discount,
      total,
      codAmount,
      deliveryCity: input.customer.city,
      deliveryAddress: input.customer.address,
      postalCode: input.customer.postalCode,
      notes: input.customer.notes,
      internalNote: input.notes,
      exchangeFor: input.exchangeFor && (await isFeatureEnabled("exchange_orders")) ? input.exchangeFor : null,
      etaDate: eta,
      items: {
        create: input.items.map((i) => ({
          productId: i.productId,
          name: i.name,
          sku: i.sku,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.quantity * i.unitPrice,
        })),
      },
      events: { create: { type: "CREATED", actorType: input.source === "DASHBOARD" ? "MERCHANT" : "API", actorName: "Masar" } },
    },
    include: { customer: true, items: true },
  });
  await db.payment.create({ data: { orderId: order.id, method: paymentMethod, amount: total, status: "PENDING" } });

  await notifyMerchant(input.merchantId, {
    type: "ORDER_CREATED",
    title: `Nouvelle commande ${order.reference}`,
    body: `${order.customer.fullName} — ${order.deliveryCity} — ${(order.total / 100).toFixed(0)} DH`,
    data: { orderId: order.id },
  });
  fireWebhooks(input.merchantId, "order.created", { reference: order.reference, total, cod_amount: codAmount, city: order.deliveryCity });
  return order;
}

// ── Status transitions ────────────────────────────────────────────
const EVENT_BY_STATUS: Record<string, string> = {
  CONFIRMED: "CONFIRMED",
  READY_FOR_PICKUP: "READY",
  CANCELLED: "CANCELLED",
  DELIVERED: "DELIVERED",
  RETURNED: "RETURNED",
};

export async function transitionOrder(orderId: string, next: string, actor: Actor, opts?: { reason?: string }) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { delivery: true } });
  if (!order) throw notFound("Order not found");
  if (isTerminal(order.status)) throw badRequest(`Order is already ${order.status}`);
  if (!(ORDER_TRANSITIONS[order.status] ?? []).includes(next)) {
    throw badRequest(`Cannot move order from ${order.status} to ${next}`);
  }

  const now = new Date();
  const data: any = { status: next, updatedAt: now };
  if (next === "CONFIRMED") data.confirmedAt = now;
  if (next === "READY_FOR_PICKUP") data.etaDate = order.etaDate ?? new Date(now.getTime() + 48 * 3600000);
  if (next === "CANCELLED") {
    data.cancelledAt = now;
    await restockItems(orderId);
    if (order.delivery) await db.delivery.delete({ where: { id: order.delivery.id } }).catch(() => {});
    await db.payment.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "REFUNDED" } });
  }

  const updated = await db.order.update({ where: { id: orderId }, data });
  await db.orderEvent.create({
    data: { orderId, type: EVENT_BY_STATUS[next] ?? next, actorType: actor.type, actorName: actor.name, message: opts?.reason },
  });

  if (next === "CONFIRMED") {
    await notifyMerchant(order.merchantId, { type: "ORDER_CONFIRMED", title: `Commande ${order.reference} confirmée`, data: { orderId } });
    fireWebhooks(order.merchantId, "order.confirmed", { reference: order.reference });
  }
  return updated;
}

// ── Courier assignment ────────────────────────────────────────────
export async function assignCourier(orderId: string, courierId: string, actor: Actor) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Order not found");
  if (isTerminal(order.status)) throw badRequest("Order is already finalized");
  const courier = await db.courier.findUnique({ where: { id: courierId }, include: { user: true } });
  if (!courier || courier.status !== "ACTIVE") throw badRequest("Courier is not active");

  await db.delivery.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      courierId,
      status: "ASSIGNED",
      otpCode: generateOtp(),
      createdAt: new Date(),
    },
    update: { courierId, status: order.status === "PICKED_UP" ? "PICKED_UP" : "ASSIGNED" },
  });
  await db.order.update({
    where: { id: orderId },
    data: {
      courierId,
      ...(order.status === "NEW" ? { status: "CONFIRMED" } : {}),
    },
  });
  await db.orderEvent.create({
    data: { orderId, type: "ASSIGNED", actorType: actor.type, actorName: actor.name, message: courier.user.name },
  });
  await notify({
    userId: courier.userId,
    type: "COURIER_ASSIGNED",
    title: "Nouveau colis assigné",
    body: `${order.reference} — ${order.deliveryCity} — ${(order.codAmount / 100).toFixed(0)} DH`,
    data: { orderId },
  });
  fireWebhooks(order.merchantId, "order.confirmed", { reference: order.reference, courier_assigned: courier.employeeCode });
  return { ok: true };
}

// ── Delivery lifecycle (courier app) ─────────────────────────────
export type AttemptInput = {
  result: "DELIVERED" | "FAILED" | "POSTPONED";
  reason?: string; // fail reason code
  note?: string;
  otp?: string;
  proofType?: "OTP" | "SIGNATURE" | "PHOTO";
  signature?: string; // dataURL
  photo?: string; // dataURL
  gpsLat?: number;
  gpsLng?: number;
  nextActionAt?: Date;
  exchangePickedUp?: boolean;
};

export async function recordAttempt(deliveryId: string, input: AttemptInput, actor: Actor) {
  const delivery = await db.delivery.findUnique({
    where: { id: deliveryId },
    include: { order: { include: { customer: true, merchant: true } } },
  });
  if (!delivery) throw notFound("Delivery not found");
  if (actor.type === "COURIER" && actor.id && delivery.courierId !== actor.id) {
    throw forbidden("This delivery is not assigned to you");
  }
  if (["DELIVERED", "RETURNED"].includes(delivery.status)) throw badRequest("Delivery is already finalized");

  const order = delivery.order;
  const now = new Date();
  const number = delivery.attempts + 1;
  const gpsLat = input.gpsLat ?? delivery.gpsLat;
  const gpsLng = input.gpsLng ?? delivery.gpsLng;

  if (input.result === "DELIVERED") {
    if (delivery.otpCode && input.otp && input.otp !== delivery.otpCode) {
      throw badRequest("OTP does not match");
    }
    await db.deliveryAttempt.create({
      data: { deliveryId, number, result: "DELIVERED", reason: null, courierNote: input.note, proofType: input.proofType ?? (input.otp ? "OTP" : null), gpsLat, gpsLng, occurredAt: now },
    });
    await db.delivery.update({
      where: { id: deliveryId },
      data: {
        status: "DELIVERED", attempts: number, deliveredAt: now,
        codCollected: order.codAmount, codStatus: order.codAmount > 0 ? "COLLECTED" : "WAIVED",
        gpsLat, gpsLng, proofSignature: input.signature, proofPhoto: input.photo, failureReason: null, nextActionAt: null,
      },
    });
    await db.order.update({ where: { id: order.id }, data: { status: "DELIVERED", deliveredAt: now, attemptCount: number, updatedAt: now } });
    if (input.exchangePickedUp && order.exchangeFor) {
      await db.delivery.update({ where: { id: deliveryId }, data: { exchangePickedUp: true } });
      await db.orderEvent.create({ data: { orderId: order.id, type: "NOTE", actorType: actor.type, actorName: actor.name, message: "Ancien colis " + order.exchangeFor + " récupéré (échange)" } });
    }
    await db.orderEvent.create({ data: { orderId: order.id, type: "DELIVERED", actorType: actor.type, actorName: actor.name } });
    await db.payment.updateMany({ where: { orderId: order.id }, data: { status: "COLLECTED", collectedAt: now } });

    // COD ledger: credit collection, debit delivery fee
    if (order.codAmount > 0) {
      await db.codTransaction.create({
        data: { merchantId: order.merchantId, orderId: order.id, type: "COD_COLLECTION", amount: order.codAmount, status: "AVAILABLE", description: `Encaissement ${order.reference}`, occurredAt: now },
      });
    }
    const quote = await quoteDelivery({ cityFr: order.deliveryCity });
    await db.codTransaction.create({
      data: { merchantId: order.merchantId, orderId: order.id, type: "DELIVERY_FEE", amount: -quote.total, status: "AVAILABLE", description: `Frais de livraison ${order.reference} (${order.deliveryCity})`, occurredAt: now },
    });
    await recalcWallet(order.merchantId);

    await notifyMerchant(order.merchantId, {
      type: "DELIVERED",
      title: `Commande ${order.reference} livrée`,
      body: `${order.customer.fullName} — ${(order.total / 100).toFixed(0)} DH encaissés`,
      data: { orderId: order.id },
    });
    fireWebhooks(order.merchantId, "order.delivered", { reference: order.reference, cod_collected: order.codAmount, attempts: number });
    await customerWhatsApp("DELIVERED", order, order.customer, order.merchant.name);
    return { status: "DELIVERED" };
  }

  // FAILED / POSTPONED
  const reason = input.result === "POSTPONED" ? "POSTPONED" : input.reason ?? "NO_ANSWER";
  await db.deliveryAttempt.create({
    data: { deliveryId, number, result: input.result === "POSTPONED" ? "POSTPONED" : "FAILED", reason, courierNote: input.note, gpsLat, gpsLng, occurredAt: now },
  });
  await db.orderEvent.create({
    data: { orderId: order.id, type: "ATTEMPT", actorType: actor.type, actorName: actor.name, message: `Tentative ${number} : ${reason}` },
  });

  const maxAttempts = 3;
  if (input.result === "POSTPONED" || number < maxAttempts) {
    const nextAt = input.nextActionAt ?? new Date(now.getTime() + 24 * 3600000);
    await db.delivery.update({
      where: { id: deliveryId },
      data: { status: "IN_TRANSIT", attempts: number, failureReason: reason, nextActionAt: nextAt, gpsLat, gpsLng },
    });
    await db.order.update({ where: { id: order.id }, data: { status: "IN_TRANSIT", attemptCount: number, failedAt: now, updatedAt: now } });
    await notifyMerchant(order.merchantId, {
      type: "FAILED",
      title: `Tentative ${number} échouée — ${order.reference}`,
      body: `${reason}${input.note ? ` — ${input.note}` : ""}. Nouvelle tentative programmée.`,
      data: { orderId: order.id },
    });
    await customerWhatsApp("FAILED", order, order.customer, order.merchant.name, { nextDate: nextAt.toLocaleDateString("fr-MA") });
    return { status: "IN_TRANSIT", retryScheduled: true };
  }

  // final failure → stays FAILED, merchant decides return
  await db.delivery.update({
    where: { id: deliveryId },
    data: { status: "FAILED", attempts: number, failureReason: reason, nextActionAt: new Date(now.getTime() + 48 * 3600000), gpsLat, gpsLng },
  });
  await db.order.update({ where: { id: order.id }, data: { status: "FAILED", attemptCount: number, failedAt: now, updatedAt: now } });
  await notifyMerchant(order.merchantId, {
    type: "FAILED",
    title: `Échec définitif — ${order.reference}`,
    body: `3 tentatives épuisées (${reason}). Ouvrez un retour ou relancez la livraison.`,
    data: { orderId: order.id },
  });
  fireWebhooks(order.merchantId, "order.failed", { reference: order.reference, attempts: number, reason });
  return { status: "FAILED", retryScheduled: false };
}

/** Courier en-route milestones. */
export async function advanceDelivery(deliveryId: string, to: "PICKED_UP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY", actor: Actor) {
  const delivery = await db.delivery.findUnique({ where: { id: deliveryId }, include: { order: true } });
  if (!delivery) throw notFound("Delivery not found");
  if (actor.type === "COURIER" && actor.id && delivery.courierId !== actor.id) throw forbidden("Not your delivery");
  const now = new Date();
  const data: any = { status: to, updatedAt: now };
  if (to === "PICKED_UP") data.pickedUpAt = now;
  if (to === "OUT_FOR_DELIVERY") data.outForDeliveryAt = now;

  await db.delivery.update({ where: { id: deliveryId }, data });
  await db.order.update({ where: { id: delivery.orderId }, data: { status: to, pickedUpAt: to === "PICKED_UP" ? now : undefined, updatedAt: now } });
  await db.orderEvent.create({ data: { orderId: delivery.orderId, type: to, actorType: actor.type, actorName: actor.name } });
  if (to === "OUT_FOR_DELIVERY") {
    await notifyMerchant(delivery.order.merchantId, {
      type: "OUT_FOR_DELIVERY",
      title: `Colis en cours de livraison — ${delivery.order.reference}`,
      data: { orderId: delivery.orderId },
    });
    const full = await orderCustomer(delivery.orderId);
    if (full) {
      await sendCustomerWhatsApp({
        template: "OUT_FOR_DELIVERY",
        phone: full.customer.phone,
        merchantId: full.merchantId,
        orderId: full.id,
        input: {
          customerName: full.customer.fullName,
          reference: full.reference,
          merchantName: full.merchant.name,
          trackingUrl: trackingUrl(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000", full.reference),
          otp: delivery.otpCode ?? undefined,
          amount: full.codAmount > 0 ? (full.codAmount / 100).toFixed(2) + " DH" : undefined,
          supportPhone: "+212 5 22 00 00 00",
        },
      });
    }
  }
  return { ok: true };
}

// ── Returns ───────────────────────────────────────────────────────
export async function createReturn(orderId: string, reason: string, actor: Actor, note?: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { delivery: true } });
  if (!order) throw notFound("Order not found");
  if (order.status === "RETURNED") throw badRequest("Order is already returned");
  const ret = await db.return.create({
    data: { orderId, merchantId: order.merchantId, reason, note, status: "REQUESTED", courierId: order.courierId },
  });
  await db.orderEvent.create({ data: { orderId, type: "NOTE", actorType: actor.type, actorName: actor.name, message: `Retour demandé : ${reason}` } });
  await notifyMerchant(order.merchantId, { type: "RETURNED", title: `Retour demandé — ${order.reference}`, body: reason, data: { orderId } });
  return ret;
}

export async function transitionReturn(returnId: string, next: "ASSIGNED" | "IN_TRANSIT" | "RECEIVED" | "COMPLETED", actor: Actor, courierId?: string) {
  const ret = await db.return.findUnique({ where: { id: returnId }, include: { order: { include: { delivery: true } } } });
  if (!ret) throw notFound("Return not found");
  const data: any = { status: next };
  if (courierId) data.courierId = courierId;
  if (next === "COMPLETED") {
    data.completedAt = new Date();
    const quote = await quoteDelivery({ cityFr: ret.order.deliveryCity });
    await db.codTransaction.create({
      data: { merchantId: ret.merchantId, orderId: ret.orderId, type: "RETURN_FEE", amount: -quote.returnFee, status: "AVAILABLE", description: `Frais de retour ${ret.order.reference}`, occurredAt: new Date() },
    });
    await db.order.update({ where: { id: ret.orderId }, data: { status: "RETURNED", returnedAt: new Date(), updatedAt: new Date() } });
    if (ret.order.delivery) {
      await db.delivery.update({ where: { id: ret.order.delivery.id }, data: { status: "RETURNED" } });
    }
    await db.customer.update({ where: { id: ret.order.customerId }, data: { returnedCount: { increment: 1 } } });
    await recalcWallet(ret.merchantId);
    fireWebhooks(ret.merchantId, "return.completed", { reference: ret.order.reference });
  }
  if (ret.order.delivery) {
    const map: Record<string, string> = { ASSIGNED: "RETURN_IN_TRANSIT", IN_TRANSIT: "RETURN_IN_TRANSIT", RECEIVED: "RETURN_IN_TRANSIT", COMPLETED: "RETURNED" };
    await db.delivery.update({ where: { id: ret.order.delivery.id }, data: { status: map[next] } }).catch(() => {});
  }
  await db.return.update({ where: { id: returnId }, data });
  return { ok: true };
}

// ── Wallet ────────────────────────────────────────────────────────
export async function recalcWallet(merchantId: string) {
  const agg = await db.codTransaction.aggregate({
    _sum: { amount: true },
    where: { merchantId, status: "AVAILABLE" },
  });
  await db.merchant.update({ where: { id: merchantId }, data: { walletBalance: agg._sum.amount ?? 0 } });
}

export async function requestSettlement(merchantId: string, actor: Actor, options?: { amount?: number; isInstant?: boolean }) {
  const merchant = await db.merchant.findUnique({ where: { id: merchantId } });
  if (!merchant) throw notFound("Merchant not found");
  if (merchant.walletBalance < 20000) throw new ApiError(400, "MIN_BALANCE", "Available balance must be at least 200 DH");

  const requestedAmount = options?.amount;
  if (requestedAmount !== undefined) {
    if (requestedAmount < 20000) throw new ApiError(400, "MIN_BALANCE", "Minimum withdrawal amount is 200 DH");
    if (requestedAmount > merchant.walletBalance) throw new ApiError(400, "EXCEEDS_BALANCE", "Requested amount exceeds available balance");
  }

  const net = requestedAmount ?? merchant.walletBalance;
  const isInstant = Boolean(options?.isInstant);
  const method = isInstant ? "INSTANT_TRANSFER" : "BANK_TRANSFER";

  const txs = await db.codTransaction.findMany({ where: { merchantId, status: "AVAILABLE" } });
  const gross = txs.filter((t) => t.type === "COD_COLLECTION").reduce((a, t) => a + t.amount, 0);
  const fees = txs.filter((t) => t.type !== "COD_COLLECTION").reduce((a, t) => a - t.amount, 0);

  const count = await db.settlement.count();
  const settlement = await db.settlement.create({
    data: {
      reference: `STL-2026-${String(count + 1).padStart(4, "0")}`,
      merchantId,
      grossCOD: requestedAmount ? net : gross,
      fees: requestedAmount ? 0 : fees,
      netAmount: net,
      status: "PROCESSING",
      method,
      createdAt: new Date(),
    },
  });

  if (!requestedAmount || requestedAmount === merchant.walletBalance) {
    await db.codTransaction.updateMany({ where: { id: { in: txs.map((t) => t.id) } }, data: { status: "SETTLED", settlementId: settlement.id, settledAt: new Date() } });
    await db.codTransaction.create({
      data: { merchantId, type: "SETTLEMENT", amount: -net, status: "SETTLED", description: `Versement ${settlement.reference}${isInstant ? " (Instantané)" : ""}`, settlementId: settlement.id, occurredAt: new Date() },
    });
  } else {
    // Partial withdrawal: log transaction as AVAILABLE with negative amount so recalcWallet subtracts it cleanly
    await db.codTransaction.create({
      data: { merchantId, type: "SETTLEMENT", amount: -net, status: "AVAILABLE", description: `Versement partiel ${settlement.reference}${isInstant ? " (Instantané)" : ""}`, settlementId: settlement.id, occurredAt: new Date() },
    });
  }

  await recalcWallet(merchantId);
  await notifyMerchant(merchantId, { type: "SETTLEMENT_AVAILABLE", title: `Versement ${settlement.reference} en cours`, body: `${(net / 100).toFixed(2)} DH en cours de transfert`, data: { settlementId: settlement.id } });
  await audit({ actorId: actor.id, actorName: actor.name, actorType: actor.type === "API" ? "API" : "MERCHANT", action: "SETTLEMENT_REQUESTED", entity: "Settlement", entityId: settlement.id, meta: `${(net / 100).toFixed(2)} DH (${method})` });
  return settlement;
}

export async function markSettlementPaid(settlementId: string, actor: Actor, input?: { paymentReference?: string; paymentNote?: string }) {
  const settlement = await db.settlement.findUnique({ where: { id: settlementId } });
  if (!settlement) throw notFound("Settlement not found");
  if (settlement.status === "PAID") throw badRequest("Settlement is already paid");
  await db.settlement.update({ where: { id: settlementId }, data: { status: "PAID", paidAt: new Date(), paymentReference: input?.paymentReference || null, paymentNote: input?.paymentNote || null } });
  await audit({ actorId: actor.id, actorName: actor.name, actorType: "ADMIN", action: "SETTLEMENT_PAID", entity: "Settlement", entityId: settlementId, meta: `${settlement.reference}${input?.paymentReference ? ` — ${input.paymentReference}` : ""}` });
  await notifyMerchant(settlement.merchantId, { type: "SETTLEMENT_AVAILABLE", title: `Versement ${settlement.reference} payé`, body: `${(settlement.netAmount / 100).toFixed(2)} DH transférés` });
  fireWebhooks(settlement.merchantId, "settlement.paid", { reference: settlement.reference, net_amount: settlement.netAmount });
  return { ok: true };
}


// ── Delivery slots (customer-chosen window) ─────────────────────
export async function chooseSlot(reference: string, slotDate: string, slotWindow: string) {
  const order = await db.order.findUnique({ where: { reference: reference.toUpperCase() } });
  if (!order) throw notFound("Order not found");
  if (!["CONFIRMED", "READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(order.status)) {
    throw badRequest("Slot can only be chosen while the parcel is on its way");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(slotDate) || !/^[0-9]{1,2}h-[0-9]{1,2}h$/.test(slotWindow)) {
    throw badRequest("Invalid slot");
  }
  const date = new Date(slotDate + "T00:00:00");
  if (date.getTime() < Date.now() - DAY_MS) throw badRequest("Slot is in the past");
  await db.order.update({ where: { id: order.id }, data: { slotDate, slotWindow } });
  await db.orderEvent.create({ data: { orderId: order.id, type: "NOTE", actorType: "SYSTEM", actorName: "Client", message: `Client selected delivery slot ${slotDate} (${slotWindow})` } });
  await db.delivery.updateMany({ where: { orderId: order.id }, data: { nextActionAt: new Date(slotDate + "T09:00:00") } }).catch(() => {});
  return { slotDate, slotWindow };
}

// ── Post-delivery rating ────────────────────────────────────────
export async function rateDelivery(reference: string, stars: number, comment?: string) {
  const order = await db.order.findUnique({ where: { reference: reference.toUpperCase() }, include: { delivery: true } });
  if (!order || !order.delivery) throw notFound("Delivery not found");
  if (order.status !== "DELIVERED") throw badRequest("You can rate after delivery only");
  const existing = await db.deliveryRating.findUnique({ where: { deliveryId: order.delivery.id } });
  if (existing) throw badRequest("Already rated");
  if (stars < 1 || stars > 5) throw badRequest("Stars must be 1–5");
  const rating = await db.deliveryRating.create({ data: { deliveryId: order.delivery.id, orderId: order.id, stars, comment } });
  // feed courier rating (weighted 5%)
  if (order.courierId) {
    const courier = await db.courier.findUnique({ where: { id: order.courierId } });
    if (courier) {
      await db.courier.update({ where: { id: courier.id }, data: { rating: Math.round((courier.rating * 0.95 + stars * 0.05) * 10) / 10 } });
    }
  }
  return rating;
}

// ── Pickup point (relais) selection ─────────────────────────────
export async function setPickupPoint(reference: string, pickupPointId: string) {
  const order = await db.order.findUnique({ where: { reference: reference.toUpperCase() } });
  if (!order) throw notFound("Order not found");
  if (!["CONFIRMED", "READY_FOR_PICKUP", "PICKED_UP"].includes(order.status)) throw badRequest("Too late to change to a pickup point");
  const point = await db.pickupPoint.findUnique({ where: { id: pickupPointId } });
  if (!point || !point.isActive) throw notFound("Pickup point not found");
  if (point.city !== order.deliveryCity) throw badRequest("Pickup point must be in the delivery city");
  await db.order.update({
    where: { id: order.id },
    data: {
      pickupPointId: point.id,
      deliveryAddress: point.address,
      notes: order.notes ? order.notes + " (Relais)" : "Relais — remise contre code OTP",
    },
  });
  await db.orderEvent.create({ data: { orderId: order.id, type: "NOTE", actorType: "SYSTEM", actorName: "Client", message: `Client selected pickup point ${point.name}` } });
  return { pickupPointId: point.id, name: point.name };
}

const DAY_MS = 86400000;
