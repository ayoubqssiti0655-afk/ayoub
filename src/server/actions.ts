"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { getCurrentUser, getMerchantContext, hashPassword, verifyPassword } from "@/lib/auth";
import { createOrder, transitionOrder, assignCourier, recordAttempt, createReturn, transitionReturn, requestSettlement } from "@/server/orders";
import { ApiError } from "@/lib/api";
import { audit } from "@/server/audit";
import { fireWebhooks } from "@/server/notifications";
import { toCsv } from "@/lib/utils";

async function requireMerchant() {
  const ctx = await getMerchantContext();
  if (!ctx) throw new Error("UNAUTHORIZED");
  if (ctx.merchant.status === "SUSPENDED") throw new ApiError(403, "SUSPENDED", "Account suspended");
  return ctx;
}

export type ActionResult<T = any> = { ok: boolean; message?: string; data?: T };

function fail(e: unknown): ActionResult {
  if (e instanceof ApiError) return { ok: false, message: e.message };
  console.error("[action]", e);
  return { ok: false, message: "An unexpected error occurred" };
}

// ── Orders ────────────────────────────────────────────────────────
const createOrderSchema = z.object({
  customer: z.object({
    id: z.string().optional(),
    fullName: z.string().min(3).max(120),
    phone: z.string().regex(/^(\+212[67]\d{8}|0[67]\d{8})$/, "Invalid Moroccan phone"),
    secondaryPhone: z.string().optional().or(z.literal("")),
    city: z.string().min(2),
    address: z.string().min(5).max(300),
    postalCode: z.string().optional().or(z.literal("")),
    notes: z.string().max(500).optional().or(z.literal("")),
  }),
  items: z.array(z.object({
    productId: z.string().optional(),
    name: z.string().min(1),
    sku: z.string().optional(),
    quantity: z.number().int().min(1).max(99),
    unitPrice: z.number().int().min(1),
  })).min(1),
  shippingFee: z.number().int().min(0),
  discount: z.number().int().min(0).default(0),
  cod: z.boolean().default(true),
  notes: z.string().max(500).optional().or(z.literal("")),
  exchangeFor: z.string().max(12).optional().or(z.literal("")),
});

export async function createOrderAction(input: unknown): Promise<ActionResult> {
  try {
    const { merchant, user } = await requireMerchant();
    const data = createOrderSchema.parse(input);
    const order = await createOrder({
      merchantId: merchant.id,
      customer: {
        ...data.customer,
        secondaryPhone: data.customer.secondaryPhone || undefined,
        notes: data.customer.notes || undefined,
        phone: data.customer.phone.replace(/^0/, "+212"),
      },
      items: data.items,
      shippingFee: data.shippingFee,
      discount: data.discount,
      paymentMethod: data.cod ? "COD" : "PREPAID",
      notes: data.notes || undefined,
      exchangeFor: data.exchangeFor || undefined,
    });
    await audit({ actorId: user.id, actorName: user.name, actorType: "MERCHANT", action: "ORDER_CREATED", entity: "Order", entityId: order.id, meta: order.reference });
    revalidatePath("/app/orders");
    revalidatePath("/app");
    return { ok: true, data: { id: order.id, reference: order.reference } };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: e.issues[0]?.message ?? "Invalid data" };
    return fail(e);
  }
}

export async function confirmOrdersAction(ids: string[]): Promise<ActionResult> {
  try {
    const { merchant, user } = await requireMerchant();
    for (const id of ids) {
      const order = await db.order.findFirst({ where: { id, merchantId: merchant.id } });
      if (!order) continue;
      try { await transitionOrder(id, "CONFIRMED", { id: user.id, name: user.name, type: "MERCHANT" }); } catch {}
    }
    revalidatePath("/app/orders");
    revalidatePath("/app");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function markReadyAction(ids: string[]): Promise<ActionResult> {
  try {
    const { merchant, user } = await requireMerchant();
    for (const id of ids) {
      const order = await db.order.findFirst({ where: { id, merchantId: merchant.id } });
      if (!order) continue;
      try { await transitionOrder(id, "READY_FOR_PICKUP", { id: user.id, name: user.name, type: "MERCHANT" }); } catch {}
    }
    revalidatePath("/app/orders");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function cancelOrderAction(id: string): Promise<ActionResult> {
  try {
    const { merchant, user } = await requireMerchant();
    const order = await db.order.findFirst({ where: { id, merchantId: merchant.id } });
    if (!order) return { ok: false, message: "Order not found" };
    await transitionOrder(id, "CANCELLED", { id: user.id, name: user.name, type: "MERCHANT" });
    await audit({ actorId: user.id, actorName: user.name, actorType: "MERCHANT", action: "ORDER_CANCELLED", entity: "Order", entityId: id, meta: order.reference });
    revalidatePath(`/app/orders/${id}`);
    revalidatePath("/app/orders");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function assignCourierAction(orderId: string, courierId: string): Promise<ActionResult> {
  try {
    const { merchant, user } = await requireMerchant();
    const order = await db.order.findFirst({ where: { id: orderId, merchantId: merchant.id } });
    if (!order) return { ok: false, message: "Order not found" };
    await assignCourier(orderId, courierId, { id: user.id, name: user.name, type: "MERCHANT" });
    revalidatePath(`/app/orders/${orderId}`);
    revalidatePath("/app/deliveries");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function addOrderNoteAction(orderId: string, note: string): Promise<ActionResult> {
  try {
    const { merchant, user } = await requireMerchant();
    const order = await db.order.findFirst({ where: { id: orderId, merchantId: merchant.id } });
    if (!order) return { ok: false, message: "Order not found" };
    await db.order.update({ where: { id: orderId }, data: { internalNote: note } });
    await db.orderEvent.create({ data: { orderId, type: "NOTE", actorType: "MERCHANT", actorName: user.name, message: note } });
    revalidatePath(`/app/orders/${orderId}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function retryDeliveryAction(orderId: string): Promise<ActionResult> {
  try {
    const { merchant, user } = await requireMerchant();
    const order = await db.order.findFirst({ where: { id: orderId, merchantId: merchant.id }, include: { delivery: true } });
    if (!order?.delivery) return { ok: false, message: "No delivery to retry" };
    await transitionOrder(orderId, "IN_TRANSIT", { id: user.id, name: user.name, type: "MERCHANT" });
    await db.delivery.update({ where: { id: order.delivery.id }, data: { status: "IN_TRANSIT", nextActionAt: null } });
    await db.orderEvent.create({ data: { orderId, type: "IN_TRANSIT", actorType: "MERCHANT", actorName: user.name, message: "Nouvelle tentative programmée" } });
    revalidatePath(`/app/orders/${orderId}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function createReturnAction(orderId: string, reason: string, note?: string): Promise<ActionResult> {
  try {
    const { merchant, user } = await requireMerchant();
    const order = await db.order.findFirst({ where: { id: orderId, merchantId: merchant.id } });
    if (!order) return { ok: false, message: "Order not found" };
    await createReturn(orderId, reason, { id: user.id, name: user.name, type: "MERCHANT" }, note);
    revalidatePath("/app/returns");
    revalidatePath(`/app/orders/${orderId}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function transitionReturnAction(returnId: string, next: string, courierId?: string): Promise<ActionResult> {
  try {
    const { merchant, user } = await requireMerchant();
    const ret = await db.return.findFirst({ where: { id: returnId, merchantId: merchant.id } });
    if (!ret) return { ok: false, message: "Return not found" };
    await transitionReturn(returnId, next as any, { id: user.id, name: user.name, type: "MERCHANT" }, courierId);
    revalidatePath("/app/returns");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function exportOrdersAction(ids: string[]): Promise<ActionResult> {
  try {
    const { merchant } = await requireMerchant();
    const orders = await db.order.findMany({
      where: { merchantId: merchant.id, id: { in: ids } },
      include: { customer: true },
    });
    const csv = toCsv(orders.map((o) => ({
      reference: o.reference,
      status: o.status,
      customer: o.customer.fullName,
      phone: o.customer.phone,
      city: o.deliveryCity,
      total: (o.total / 100).toFixed(2),
      cod: (o.codAmount / 100).toFixed(2),
      created: o.createdAt.toISOString().slice(0, 10),
    })));
    return { ok: true, data: { csv } };
  } catch (e) { return fail(e); }
}

// ── Products ──────────────────────────────────────────────────────
const productSchema = z.object({
  name: z.string().min(2).max(150),
  sku: z.string().max(40).optional().or(z.literal("")),
  category: z.string().max(60).optional().or(z.literal("")),
  price: z.number().int().min(100),
  stock: z.number().int().min(0),
  imageUrl: z.string().max(300).optional().or(z.literal("")),
});

export async function saveProductAction(id: string | null, input: unknown): Promise<ActionResult> {
  try {
    const { merchant, user } = await requireMerchant();
    const data = productSchema.parse(input);
    const payload = {
      name: data.name,
      sku: data.sku || null,
      category: data.category || null,
      price: data.price,
      stock: data.stock,
      imageUrl: data.imageUrl || null,
    };
    if (id) {
      await db.product.updateMany({ where: { id, merchantId: merchant.id }, data: payload });
    } else {
      await db.product.create({ data: { ...payload, merchantId: merchant.id } });
    }
    revalidatePath("/app/products");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: e.issues[0]?.message ?? "Invalid data" };
    return fail(e);
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  try {
    const { merchant } = await requireMerchant();
    await db.product.updateMany({ where: { id, merchantId: merchant.id }, data: { isActive: false } });
    revalidatePath("/app/products");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function importProductsAction(csv: string): Promise<ActionResult> {
  try {
    const { merchant } = await requireMerchant();
    const lines = csv.split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return { ok: false, message: "Empty file" };
    const header = lines[0].split(";").map((h) => h.trim().toLowerCase());
    const idx = (k: string) => header.indexOf(k);
    const items = lines.slice(1).map((line) => {
      const cells = line.split(";");
      return {
        name: cells[idx("name")] ?? "",
        sku: cells[idx("sku")] || null,
        category: cells[idx("category")] || null,
        price: Math.round(parseFloat((cells[idx("price")] ?? "0").replace(",", ".")) * 100) || 0,
        stock: parseInt(cells[idx("stock")] ?? "0", 10) || 0,
      };
    }).filter((p) => p.name && p.price > 0);
    if (!items.length) return { ok: false, message: "No valid rows (need name + price)" };
    await db.product.createMany({ data: items.map((p) => ({ ...p, merchantId: merchant.id })) });
    revalidatePath("/app/products");
    return { ok: true, data: { count: items.length } };
  } catch (e) { return fail(e); }
}

// ── Customers ─────────────────────────────────────────────────────
export async function createCustomerAction(input: {
  fullName: string; phone: string; secondaryPhone?: string; city: string; address?: string; notes?: string;
}): Promise<ActionResult> {
  try {
    const { merchant } = await requireMerchant();
    const phone = input.phone.replace(/^0/, "+212");
    const exists = await db.customer.findUnique({ where: { merchantId_phone: { merchantId: merchant.id, phone } } });
    if (exists) return { ok: false, message: "A customer with this phone already exists" };
    await db.customer.create({ data: { merchantId: merchant.id, ...input, phone, secondaryPhone: input.secondaryPhone?.replace(/^0/, "+212") } });
    revalidatePath("/app/customers");
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ── Wallet ────────────────────────────────────────────────────────
export async function requestSettlementAction(input?: { amount?: number; isInstant?: boolean }): Promise<ActionResult> {
  try {
    const { merchant, user } = await requireMerchant();
    const stl = await requestSettlement(merchant.id, { id: user.id, name: user.name, type: "MERCHANT" }, input);
    revalidatePath("/app/wallet");
    return { ok: true, data: { reference: stl.reference } };
  } catch (e) { return fail(e); }
}

export async function getMerchantBankAction(): Promise<ActionResult<{ bankName: string; rib: string; accountHolder: string } | null>> {
  try {
    const { merchant } = await requireMerchant();
    const setting = await db.setting.findUnique({ where: { key: `merchant_bank_${merchant.id}` } });
    if (!setting) return { ok: true, data: null };
    return { ok: true, data: JSON.parse(setting.value) };
  } catch (e) { return fail(e); }
}

export async function saveMerchantBankAction(input: { bankName: string; rib: string; accountHolder: string }): Promise<ActionResult> {
  try {
    const { merchant } = await requireMerchant();
    const cleanRib = input.rib.replace(/\s+/g, "");
    if (!/^\d{24}$/.test(cleanRib)) {
      return { ok: false, message: "Le RIB marocain doit comporter exactement 24 chiffres" };
    }
    if (!input.bankName.trim() || !input.accountHolder.trim()) {
      return { ok: false, message: "Le nom de la banque et du titulaire sont requis" };
    }
    await db.setting.upsert({
      where: { key: `merchant_bank_${merchant.id}` },
      create: { key: `merchant_bank_${merchant.id}`, value: JSON.stringify({ bankName: input.bankName.trim(), rib: cleanRib, accountHolder: input.accountHolder.trim() }) },
      update: { value: JSON.stringify({ bankName: input.bankName.trim(), rib: cleanRib, accountHolder: input.accountHolder.trim() }) },
    });
    revalidatePath("/app/wallet");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function updateSettlementCycleAction(cycle: string): Promise<ActionResult> {
  try {
    const { merchant } = await requireMerchant();
    if (!["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"].includes(cycle)) {
      return { ok: false, message: "Invalid settlement cycle" };
    }
    await db.$transaction([
      db.merchant.update({
        where: { id: merchant.id },
        data: { settlementCycle: cycle },
      }),
      db.setting.upsert({
        where: { key: `merchant_cycle_chosen_${merchant.id}` },
        create: { key: `merchant_cycle_chosen_${merchant.id}`, value: "true" },
        update: { value: "true" },
      }),
    ]);
    revalidatePath("/app/wallet");
    revalidatePath("/app/settings");
    return { ok: true, data: { cycle } };
  } catch (e) { return fail(e); }
}

// ── Settings / profile ────────────────────────────────────────────
export async function updateProfileAction(input: { name: string; phone?: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, message: "Unauthorized" };
    await db.user.update({ where: { id: user.id }, data: { name: input.name, phone: input.phone ?? user.phone } });
    revalidatePath("/app/settings");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function updateCourierProfileAction(input: { name: string; phone: string; vehicle: string; zones: string[] }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.courierProfile) return { ok: false, message: "Unauthorized" };
    if (!input.name.trim() || !input.phone.trim()) return { ok: false, message: "Name and phone are required" };
    if (!["MOTORCYCLE", "CAR", "VAN"].includes(input.vehicle)) return { ok: false, message: "Invalid vehicle" };
    if (!input.zones.length) return { ok: false, message: "Select at least one delivery zone" };
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { name: input.name.trim(), phone: input.phone.trim() } }),
      db.courier.update({ where: { id: user.courierProfile.id }, data: { vehicle: input.vehicle, zones: JSON.stringify(input.zones) } }),
    ]);
    await audit({ actorId: user.id, actorName: input.name.trim(), actorType: "COURIER", action: "COURIER_PROFILE_UPDATED", entity: "Courier", entityId: user.courierProfile.id });
    revalidatePath("/courier/profile");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function changeCourierPasswordAction(input: { current: string; next: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.courierProfile) return { ok: false, message: "Unauthorized" };
    if (!(await verifyPassword(input.current, user.passwordHash))) return { ok: false, message: "Current password is incorrect" };
    if (input.next.length < 8) return { ok: false, message: "Password must be at least 8 characters" };
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.next) } });
    await audit({ actorId: user.id, actorName: user.name, actorType: "COURIER", action: "PASSWORD_CHANGED", entity: "User", entityId: user.id });
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function updateStoreAction(input: { name: string; city?: string; address?: string; settlementCycle?: string }): Promise<ActionResult> {
  try {
    const { merchant } = await requireMerchant();
    await db.merchant.update({
      where: { id: merchant.id },
      data: { name: input.name, city: input.city, address: input.address, settlementCycle: input.settlementCycle },
    });
    revalidatePath("/app/settings");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function changePasswordAction(input: { current: string; next: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, message: "Unauthorized" };
    if (!(await verifyPassword(input.current, user.passwordHash))) return { ok: false, message: "Current password is incorrect" };
    if (input.next.length < 8) return { ok: false, message: "Password must be at least 8 characters" };
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.next) } });
    await audit({ actorId: user.id, actorName: user.name, actorType: "MERCHANT", action: "PASSWORD_CHANGED", entity: "User", entityId: user.id });
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ── Integrations ──────────────────────────────────────────────────
export async function createApiKeyAction(name: string): Promise<ActionResult> {
  try {
    const { merchant } = await requireMerchant();
    const raw = `msk_live_${crypto.randomUUID().replace(/-/g, "")}`;
    const { hashSync } = await import("bcryptjs");
    await db.apiKey.create({
      data: {
        merchantId: merchant.id,
        name,
        prefix: raw.slice(0, 16),
        hashedKey: hashSync(raw, 8), // must match lib/api.ts verification cost
      },
    });
    return { ok: true, data: { key: raw } };
  } catch (e) { return fail(e); }
}

export async function revokeApiKeyAction(id: string): Promise<ActionResult> {
  try {
    const { merchant } = await requireMerchant();
    await db.apiKey.updateMany({ where: { id, merchantId: merchant.id }, data: { revokedAt: new Date() } });
    revalidatePath("/app/integrations");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function createWebhookAction(url: string, events: string[]): Promise<ActionResult> {
  try {
    const { merchant } = await requireMerchant();
    if (!/^https?:\/\//.test(url)) return { ok: false, message: "Invalid URL" };
    const secret = `whsec_${crypto.randomUUID().replace(/-/g, "")}`;
    await db.webhook.create({ data: { merchantId: merchant.id, url, events: JSON.stringify(events), secret } });
    revalidatePath("/app/integrations");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function toggleWebhookAction(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    const { merchant } = await requireMerchant();
    await db.webhook.updateMany({ where: { id, merchantId: merchant.id }, data: { isActive } });
    revalidatePath("/app/integrations");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteWebhookAction(id: string): Promise<ActionResult> {
  try {
    const { merchant } = await requireMerchant();
    await db.webhook.deleteMany({ where: { id, merchantId: merchant.id } });
    revalidatePath("/app/integrations");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function testWebhookAction(id: string): Promise<ActionResult> {
  try {
    const { merchant } = await requireMerchant();
    const hook = await db.webhook.findFirst({ where: { id, merchantId: merchant.id } });
    if (!hook) return { ok: false, message: "Webhook not found" };
    const payload = JSON.stringify({ event: "ping", created_at: new Date().toISOString(), data: { test: true } });
    let status: number | null = null;
    try {
      const res = await fetch(hook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Masar-Event": "ping", "X-Masar-Signature": hook.secret },
        body: payload,
        signal: AbortSignal.timeout(6000),
      });
      status = res.status;
    } catch { status = null; }
    await db.webhookDelivery.create({ data: { webhookId: id, event: "ping", payload, statusCode: status, ok: status != null && status < 400 } });
    await db.webhook.update({ where: { id }, data: { lastStatus: status, lastFiredAt: new Date() } });
    revalidatePath("/app/integrations");
    return { ok: status != null && status < 400, message: status == null ? "Endpoint unreachable" : `HTTP ${status}` };
  } catch (e) { return fail(e); }
}

export async function connectIntegrationAction(platform: string): Promise<ActionResult> {
  try {
    const { merchant } = await requireMerchant();
    await db.integration.upsert({
      where: { merchantId_platform: { merchantId: merchant.id, platform } },
      create: { merchantId: merchant.id, platform, status: "PENDING" },
      update: { status: "PENDING" },
    });
    revalidatePath("/app/integrations");
    return { ok: true };
  } catch (e) { return fail(e); }
}


// ── v3 features ──────────────────────────────────────────────────
export async function openDisputeAction(orderId: string, type: string, description: string): Promise<ActionResult> {
  try {
    const { merchant, user } = await requireMerchant();
    const { openDispute } = await import("@/server/disputes");
    if (!(await (await import("@/server/features")).isFeatureEnabled("disputes"))) {
      return { ok: false, message: "Feature disabled" };
    }
    const dispute = await openDispute({ orderId, merchantId: merchant.id, type, description, actor: { id: user.id, name: user.name } });
    revalidatePath("/app/returns");
    revalidatePath("/app/orders/" + orderId);
    return { ok: true, data: { id: dispute.id } };
  } catch (e) { return fail(e); }
}

export async function sendDigestAction(): Promise<ActionResult> {
  try {
    const { merchant } = await requireMerchant();
    const { isFeatureEnabled } = await import("@/server/features");
    if (!(await isFeatureEnabled("daily_digest"))) return { ok: false, message: "Feature disabled" };
    const { sendDigest } = await import("@/server/digest");
    const d = await sendDigest(merchant.id);
    return { ok: true, data: { digest: d } };
  } catch (e) { return fail(e); }
}


// ── v4 features ──────────────────────────────────────────────────
export async function createPromoAction(input: { code: string; type: string; value: number; maxUses?: number; expiresAt?: string }): Promise<ActionResult> {
  try {
    const { merchant } = await requireMerchant();
    const { isFeatureEnabled } = await import("@/server/features");
    if (!(await isFeatureEnabled("promo_codes"))) return { ok: false, message: "Feature disabled" };
    const { createPromo } = await import("@/server/promo");
    await createPromo(merchant.id, {
      code: input.code, type: input.type as "PERCENT" | "FIXED", value: Math.round(input.value),
      maxUses: input.maxUses, expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    });
    revalidatePath("/app/settings");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function togglePromoAction(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    const { merchant } = await requireMerchant();
    const { togglePromo } = await import("@/server/promo");
    await togglePromo(merchant.id, id, isActive);
    revalidatePath("/app/settings");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function openTicketAction(orderId: string, subject: string, body: string): Promise<ActionResult> {
  try {
    const { merchant, user } = await requireMerchant();
    const { isFeatureEnabled } = await import("@/server/features");
    if (!(await isFeatureEnabled("tickets"))) return { ok: false, message: "Feature disabled" };
    const { openTicket } = await import("@/server/tickets");
    const t = await openTicket({ orderId, merchantId: merchant.id, subject, body, openedBy: "MERCHANT", authorName: user.name });
    revalidatePath("/app/tickets");
    return { ok: true, data: { id: t.id } };
  } catch (e) { return fail(e); }
}

export async function replyTicketAction(ticketId: string, body: string): Promise<ActionResult> {
  try {
    const { merchant, user } = await requireMerchant();
    const { replyTicket } = await import("@/server/tickets");
    const t = await db.ticket.findFirst({ where: { id: ticketId, merchantId: merchant.id } });
    if (!t) return { ok: false, message: "Ticket not found" };
    await replyTicket(ticketId, { authorType: "MERCHANT", authorName: user.name, body });
    revalidatePath("/app/tickets");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function updateStaffPermissionsAction(userId: string, permissions: string[]): Promise<ActionResult> {
  try {
    const { merchant } = await requireMerchant();
    const { isFeatureEnabled } = await import("@/server/features");
    if (!(await isFeatureEnabled("staff_permissions"))) return { ok: false, message: "Feature disabled" };
    await db.merchantStaff.updateMany({ where: { userId, merchantId: merchant.id }, data: { permissions: JSON.stringify(permissions) } });
    revalidatePath("/app/settings");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export type BulkImportRowInput = {
  fullName: string;
  phone: string;
  city: string;
  address: string;
  productName?: string;
  codAmount: number;
  notes?: string;
};

export async function bulkImportOrdersAction(rows: BulkImportRowInput[]): Promise<ActionResult<{ count: number; failed: number }>> {
  try {
    const { merchant } = await requireMerchant();
    if (!Array.isArray(rows) || rows.length === 0) {
      return { ok: false, message: "No rows to import" };
    }

    let created = 0;
    let failed = 0;

    for (const r of rows) {
      try {
        let phone = (r.phone ?? "").toString().replace(/[\s\-]/g, "");
        if (phone.startsWith("0")) phone = "+212" + phone.slice(1);
        else if (!phone.startsWith("+212")) phone = "+212" + phone;

        const codInCentimes = Math.round(Number(r.codAmount || 0) * 100);

        await createOrder({
          merchantId: merchant.id,
          customer: {
            fullName: r.fullName || "Client",
            phone,
            city: r.city,
            address: r.address || r.city,
            notes: r.notes,
          },
          items: [
            {
              name: r.productName || "Colis",
              quantity: 1,
              unitPrice: codInCentimes > 0 ? codInCentimes : 0,
            },
          ],
          shippingFee: 0,
          paymentMethod: codInCentimes > 0 ? "COD" : "PREPAID",
          notes: r.notes,
          source: "EXCEL_IMPORT",
        });
        created++;
      } catch (err) {
        console.error("[bulkImport error for row]", r, err);
        failed++;
      }
    }

    revalidatePath("/app/orders");
    return { ok: true, data: { count: created, failed } };
  } catch (e) { return fail(e); }
}

export async function markReturnReceivedAction(returnId: string): Promise<ActionResult> {
  try {
    const { merchant } = await requireMerchant();
    const ret = await db.return.findFirst({ where: { id: returnId, merchantId: merchant.id } });
    if (!ret) return { ok: false, message: "Return record not found" };
    await db.return.update({
      where: { id: returnId },
      data: { status: "RECEIVED", completedAt: new Date() },
    });
    revalidatePath("/app/returns");
    return { ok: true };
  } catch (e) { return fail(e); }
}
