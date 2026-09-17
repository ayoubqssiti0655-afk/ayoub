"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { audit } from "@/server/audit";
import { markSettlementPaid, requestSettlement } from "@/server/orders";
import { setPricingConfig, getPricingConfig } from "@/server/pricing";
import { notify } from "@/server/notifications";

export type AdminResult = { ok: boolean; message?: string; data?: any };

function fail(e: unknown): AdminResult {
  if (e instanceof ApiError) return { ok: false, message: e.message };
  console.error("[admin-action]", e);
  return { ok: false, message: "An unexpected error occurred" };
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new ApiError(403, "FORBIDDEN", "Admin access required");
  return user;
}

// ── Merchants ─────────────────────────────────────────────────────
export async function createMerchantAction(input: {
  name: string; email: string; password: string; city: string; phone: string; plan: string;
}): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    if (await db.user.findUnique({ where: { email: input.email.toLowerCase() } })) {
      return { ok: false, message: "Email already in use" };
    }
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 6);
    const [user] = await db.$transaction([
      db.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash: await hashPassword(input.password),
          name: input.name,
          role: "MERCHANT",
          phone: input.phone,
        },
      }),
    ]);
    const merchant = await db.merchant.create({
      data: { name: input.name, slug, email: input.email, phone: input.phone, city: input.city, status: "ACTIVE", plan: input.plan },
    });
    await db.merchantStaff.create({ data: { userId: user.id, merchantId: merchant.id, staffRole: "OWNER" } });
    await audit({ actorId: admin.id, actorName: admin.name, actorType: "ADMIN", action: "MERCHANT_CREATED", entity: "Merchant", entityId: merchant.id, meta: input.name });
    revalidatePath("/admin/merchants");
    return { ok: true, data: { id: merchant.id } };
  } catch (e) { return fail(e); }
}

export async function setMerchantStatusAction(id: string, status: "ACTIVE" | "SUSPENDED" | "PENDING"): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    await db.merchant.update({ where: { id }, data: { status } });
    await audit({
      actorId: admin.id, actorName: admin.name, actorType: "ADMIN",
      action: status === "SUSPENDED" ? "MERCHANT_SUSPENDED" : "MERCHANT_ACTIVATED",
      entity: "Merchant", entityId: id,
    });
    revalidatePath("/admin/merchants");
    revalidatePath(`/admin/merchants/${id}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function updateMerchantConfigAction(id: string, input: { settlementCycle?: string; plan?: string }): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    await db.merchant.update({ where: { id }, data: input });
    await audit({ actorId: admin.id, actorName: admin.name, actorType: "ADMIN", action: "MERCHANT_UPDATED", entity: "Merchant", entityId: id });
    revalidatePath(`/admin/merchants/${id}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function resetMerchantPasswordAction(id: string, password: string): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    if (password.length < 8) return { ok: false, message: "Password must be at least 8 characters" };
    const owner = await db.merchantStaff.findFirst({ where: { merchantId: id, staffRole: "OWNER" }, select: { userId: true } });
    if (!owner) return { ok: false, message: "Merchant owner not found" };
    await db.user.update({ where: { id: owner.userId }, data: { passwordHash: await hashPassword(password) } });
    await audit({ actorId: admin.id, actorName: admin.name, actorType: "ADMIN", action: "MERCHANT_PASSWORD_RESET", entity: "Merchant", entityId: id });
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteMerchantAction(id: string): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const [merchant, orderCount, transactionCount] = await Promise.all([
      db.merchant.findUnique({ where: { id }, select: { name: true } }),
      db.order.count({ where: { merchantId: id } }),
      db.codTransaction.count({ where: { merchantId: id } }),
    ]);
    if (!merchant) return { ok: false, message: "Merchant not found" };
    if (orderCount > 0 || transactionCount > 0) return { ok: false, message: "Merchants with orders or financial transactions cannot be deleted" };
    const staff = await db.merchantStaff.findMany({ where: { merchantId: id }, select: { userId: true } });
    await db.merchant.delete({ where: { id } });
    await db.user.deleteMany({ where: { id: { in: staff.map((member) => member.userId) } } });
    await audit({ actorId: admin.id, actorName: admin.name, actorType: "ADMIN", action: "MERCHANT_DELETED", entity: "Merchant", entityId: id, meta: merchant.name });
    revalidatePath("/admin/merchants");
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ── Couriers ──────────────────────────────────────────────────────
export async function createCourierAction(input: {
  name: string; email: string; password: string; city: string; phone: string; vehicle: string;
}): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    if (await db.user.findUnique({ where: { email: input.email.toLowerCase() } })) {
      return { ok: false, message: "Email already in use" };
    }
    const count = await db.courier.count();
    const user = await db.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash: await hashPassword(input.password),
        name: input.name,
        role: "COURIER",
        phone: input.phone,
      },
    });
    await db.courier.create({
      data: {
        userId: user.id,
        employeeCode: `MSR-C${String(count + 1).padStart(3, "0")}`,
        vehicle: input.vehicle,
        homeCity: input.city,
        zones: JSON.stringify([input.city]),
        status: "ACTIVE",
      },
    });
    await audit({ actorId: admin.id, actorName: admin.name, actorType: "ADMIN", action: "COURIER_CREATED", entity: "Courier", entityId: user.id, meta: input.name });
    revalidatePath("/admin/couriers");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function setCourierStatusAction(id: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED"): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    await db.courier.update({ where: { id }, data: { status } });
    await audit({ actorId: admin.id, actorName: admin.name, actorType: "ADMIN", action: status === "ACTIVE" ? "COURIER_ACTIVATED" : "COURIER_DEACTIVATED", entity: "Courier", entityId: id });
    revalidatePath("/admin/couriers");
    revalidatePath(`/admin/couriers/${id}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function resetCourierPasswordAction(id: string, password: string): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    if (password.length < 8) return { ok: false, message: "Password must be at least 8 characters" };
    const courier = await db.courier.findUnique({ where: { id }, select: { userId: true } });
    if (!courier) return { ok: false, message: "Courier not found" };
    await db.user.update({ where: { id: courier.userId }, data: { passwordHash: await hashPassword(password) } });
    await audit({ actorId: admin.id, actorName: admin.name, actorType: "ADMIN", action: "COURIER_PASSWORD_RESET", entity: "Courier", entityId: id });
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function updateCourierZonesAction(id: string, zones: string[]): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    await db.courier.update({ where: { id }, data: { zones: JSON.stringify(zones) } });
    revalidatePath(`/admin/couriers/${id}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ── Zones & pricing ───────────────────────────────────────────────
export async function updateZoneAction(id: string, input: { deliveryFee?: number; returnFee?: number; etaHours?: number; isActive?: boolean }): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    await db.zone.update({ where: { id }, data: input });
    await audit({ actorId: admin.id, actorName: admin.name, actorType: "ADMIN", action: "PRICE_UPDATED", entity: "Zone", entityId: id });
    revalidatePath("/admin/zones");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function createCityAction(input: {
  nameFr: string; nameAr: string; nameEn: string; regionId: string; deliveryFee: number; etaHours: number; isRemote: boolean;
}): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const city = await db.city.create({
      data: {
        nameFr: input.nameFr, nameAr: input.nameAr, nameEn: input.nameEn,
        regionId: input.regionId, isRemote: input.isRemote, lat: 33.57, lng: -7.59,
      },
    });
    await db.zone.create({
      data: {
        name: `${input.nameFr} — Centre`,
        cityId: city.id,
        deliveryFee: input.deliveryFee,
        returnFee: Math.max(1500, Math.round(input.deliveryFee * 0.6)),
        etaHours: input.etaHours,
        weightSurcharge: 500,
      },
    });
    await audit({ actorId: admin.id, actorName: admin.name, actorType: "ADMIN", action: "CITY_CREATED", entity: "City", entityId: city.id, meta: input.nameFr });
    revalidatePath("/admin/zones");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function updatePricingRulesAction(input: { weightSurchargePerKg?: number; remoteMultiplier?: number; codFeePct?: number; courierFeeDefault?: number }): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    await setPricingConfig(input);
    await audit({ actorId: admin.id, actorName: admin.name, actorType: "ADMIN", action: "PRICING_RULES_UPDATED", entity: "Setting" });
    revalidatePath("/admin/pricing");
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ── Settlements ───────────────────────────────────────────────────
export async function createSettlementForMerchantAction(merchantId: string): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const stl = await requestSettlement(merchantId, { id: admin.id, name: admin.name, type: "ADMIN" });
    revalidatePath("/admin/settlements");
    return { ok: true, data: { reference: stl.reference } };
  } catch (e) { return fail(e); }
}

export async function markSettlementPaidAction(id: string, input?: { paymentReference?: string; paymentNote?: string }): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    await markSettlementPaid(id, { id: admin.id, name: admin.name, type: "ADMIN" }, input);
    revalidatePath("/admin/settlements");
    revalidatePath("/app/wallet");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function setFeatureAction(key: string, enabled: boolean): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const { FEATURES, setFeatureEnabled } = await import("@/server/features");
    if (!FEATURES.some((f) => f.key === key)) return { ok: false, message: "Unknown feature" };
    await setFeatureEnabled(key as Parameters<typeof setFeatureEnabled>[0], enabled);
    await audit({ actorId: admin.id, actorName: admin.name, actorType: "ADMIN", action: enabled ? "FEATURE_ENABLED" : "FEATURE_DISABLED", entity: "Feature", entityId: key });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function setDepositStatusAction(depositId: string, status: "VERIFIED" | "MISMATCH"): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const { setDepositStatus } = await import("@/server/cash");
    await setDepositStatus(depositId, status, admin.name);
    await audit({ actorId: admin.id, actorName: admin.name, actorType: "ADMIN", action: status === "VERIFIED" ? "DEPOSIT_VERIFIED" : "DEPOSIT_MISMATCH", entity: "CourierDeposit", entityId: depositId });
    revalidatePath("/admin/couriers");
    return { ok: true };
  } catch (e) { return fail(e); }
}

// assign courier to a delivery (admin dispatch)
export async function adminAssignCourierAction(orderId: string, courierId: string): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const { assignCourier } = await import("@/server/orders");
    await assignCourier(orderId, courierId, { id: admin.id, name: admin.name, type: "ADMIN" });
    revalidatePath("/admin/orders");
    revalidatePath("/admin/deliveries");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function resetMerchantCycleChoiceAction(id: string): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    await db.setting.deleteMany({
      where: { key: `merchant_cycle_chosen_${id}` },
    });
    await audit({
      actorId: admin.id,
      actorName: admin.name,
      actorType: "ADMIN",
      action: "MERCHANT_CYCLE_RESET",
      entity: "Merchant",
      entityId: id,
    });
    revalidatePath(`/admin/merchants/${id}`);
    revalidatePath("/app/wallet");
    revalidatePath("/app/settings");
    return { ok: true };
  } catch (e) { return fail(e); }
}



// ── v3: hub bags / disputes / relais ─────────────────────────────
export async function createBagAction(city: string, courierId: string | null): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const { isFeatureEnabled } = await import("@/server/features");
    if (!(await isFeatureEnabled("hub_bags"))) return { ok: false, message: "Feature disabled" };
    const { createBag } = await import("@/server/bags");
    const bag = await createBag(city, courierId || undefined);
    await audit({ actorId: admin.id, actorName: admin.name, actorType: "ADMIN", action: "BAG_CREATED", entity: "Bag", entityId: bag.id, meta: bag.reference });
    revalidatePath("/admin/hub");
    return { ok: true, data: { id: bag.id, reference: bag.reference } };
  } catch (e) { return fail(e); }
}

export async function addParcelToBagAction(bagId: string, reference: string): Promise<AdminResult> {
  try {
    await requireAdmin();
    const { addParcelToBag } = await import("@/server/bags");
    const r = await addParcelToBag(bagId, reference);
    revalidatePath("/admin/hub");
    return { ok: true, data: r };
  } catch (e) { return fail(e); }
}

export async function sealBagAction(bagId: string): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const { sealBag } = await import("@/server/bags");
    const r = await sealBag(bagId);
    await audit({ actorId: admin.id, actorName: admin.name, actorType: "ADMIN", action: "BAG_SEALED", entity: "Bag", entityId: bagId, meta: r.reference });
    revalidatePath("/admin/hub");
    return { ok: true, data: r };
  } catch (e) { return fail(e); }
}

export async function resolveDisputeAction(disputeId: string, outcome: "RESOLVED" | "REJECTED", resolution: string, compensation: number): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const { resolveDispute } = await import("@/server/disputes");
    await resolveDispute(disputeId, outcome, resolution, compensation, { id: admin.id, name: admin.name });
    revalidatePath("/admin/returns");
    revalidatePath("/app/wallet");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function createPickupPointAction(input: { name: string; city: string; address: string; phone: string }): Promise<AdminResult> {
  try {
    await requireAdmin();
    const { uid } = await import("@/lib/utils");
    const { db } = await import("@/server/db");
    const city = await db.city.findFirst({ where: { nameFr: input.city } });
    await db.pickupPoint.create({ data: { id: uid(), name: input.name, city: input.city, address: input.address, phone: input.phone, lat: city?.lat ?? 33.57, lng: city?.lng ?? -7.59, isActive: true } });
    revalidatePath("/admin/zones");
    return { ok: true };
  } catch (e) { return fail(e); }
}


export async function replyTicketAdminAction(ticketId: string, body: string): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const { replyTicket } = await import("@/server/tickets");
    await replyTicket(ticketId, { authorType: "ADMIN", authorName: admin.name, body });
    revalidatePath("/admin/tickets");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function resolveTicketAdminAction(ticketId: string): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const { resolveTicket } = await import("@/server/tickets");
    await resolveTicket(ticketId, admin.name);
    revalidatePath("/admin/tickets");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function changeAdminPasswordAction(input: { current: string; next: string }): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    if (!input.current || !input.next) return { ok: false, message: "Missing required fields" };
    if (input.next.length < 8) return { ok: false, message: "Password must be at least 8 characters" };
    const user = await db.user.findUnique({ where: { id: admin.id } });
    if (!user) return { ok: false, message: "Admin user not found" };
    const valid = await verifyPassword(input.current, user.passwordHash);
    if (!valid) return { ok: false, message: "Current password is incorrect" };

    await db.user.update({
      where: { id: admin.id },
      data: { passwordHash: await hashPassword(input.next) },
    });
    await audit({
      actorType: "ADMIN",
      actorName: admin.name,
      actorId: admin.id,
      action: "USER_PASSWORD_CHANGED",
      entity: "USER",
      entityId: admin.id,
    });
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function updatePlatformSettingsAction(input: { adminName: string; adminEmail: string; platformName?: string; supportPhone?: string }): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    if (!input.adminName || !input.adminEmail) return { ok: false, message: "Name and email are required" };

    // Update admin user profile
    await db.user.update({
      where: { id: admin.id },
      data: { name: input.adminName, email: input.adminEmail },
    });

    // Update platform settings
    if (input.platformName) {
      await db.setting.upsert({
        where: { key: "platform_name" },
        update: { value: input.platformName },
        create: { key: "platform_name", value: input.platformName },
      });
    }
    if (input.supportPhone) {
      await db.setting.upsert({
        where: { key: "platform_support_phone" },
        update: { value: input.supportPhone },
        create: { key: "platform_support_phone", value: input.supportPhone },
      });
    }

    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ── Admin Pro Suite Actions ───────────────────────────────────────

/** 1-Click approval of all pending courier deposits in LA CAISSE */
export async function bulkApproveDepositsAction(): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const { releaseCourierPendingCod } = await import("@/server/cash");
    const declaredDeposits = await db.courierDeposit.findMany({
      where: { status: "DECLARED" },
      select: { id: true, courierId: true, amount: true },
    });

    if (declaredDeposits.length === 0) {
      return { ok: true, message: "Aucun versement en attente", data: { count: 0 } };
    }

    const now = new Date();
    await db.courierDeposit.updateMany({
      where: { id: { in: declaredDeposits.map((d) => d.id) } },
      data: { status: "VERIFIED", verifiedAt: now, verifiedBy: admin.name },
    });

    const uniqueCouriers = Array.from(new Set(declaredDeposits.map((d) => d.courierId)));
    for (const courierId of uniqueCouriers) {
      await releaseCourierPendingCod(courierId);
    }

    await audit({
      actorId: admin.id,
      actorName: admin.name,
      actorType: "ADMIN",
      action: "DEPOSITS_BULK_VERIFIED",
      entity: "CourierDeposit",
      entityId: "BULK",
      meta: `Approuvé ${declaredDeposits.length} versements`,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/couriers");
    return { ok: true, data: { count: declaredDeposits.length } };
  } catch (e) { return fail(e); }
}

/** Smart automatic dispatch of morning parcels to best active couriers */
export async function smartDispatchMorningAction(input?: { city?: string }): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const unassignedOrders = await db.order.findMany({
      where: {
        status: { in: ["CONFIRMED", "READY_FOR_PICKUP"] },
        courierId: null,
        ...(input?.city ? { deliveryCity: input.city } : {}),
      },
      include: { delivery: true },
    });

    if (unassignedOrders.length === 0) {
      return { ok: true, message: "Aucun colis en attente d'assignation", data: { count: 0 } };
    }

    const couriers = await db.courier.findMany({
      where: { status: "ACTIVE" },
      include: {
        deliveries: {
          where: { status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"] } },
          select: { id: true },
        },
      },
    });

    if (couriers.length === 0) {
      return { ok: false, message: "Aucun livreur actif disponible" };
    }

    let dispatchedCount = 0;
    const now = new Date();

    for (const order of unassignedOrders) {
      // Find matching couriers for this order's city
      let eligible = couriers.filter((c) => {
        try {
          const zones = JSON.parse(c.zones) as string[];
          return c.homeCity === order.deliveryCity || zones.includes(order.deliveryCity);
        } catch {
          return c.homeCity === order.deliveryCity;
        }
      });

      if (eligible.length === 0) {
        eligible = couriers; // fallback to any active courier
      }

      // Sort by least workload
      eligible.sort((a, b) => a.deliveries.length - b.deliveries.length);
      const chosen = eligible[0];

      // Assign courier
      await db.order.update({
        where: { id: order.id },
        data: { courierId: chosen.id, status: "IN_TRANSIT", updatedAt: now },
      });

      if (order.delivery) {
        await db.delivery.update({
          where: { id: order.delivery.id },
          data: { courierId: chosen.id, status: "IN_TRANSIT" },
        });
      } else {
        await db.delivery.create({
          data: {
            orderId: order.id,
            courierId: chosen.id,
            status: "IN_TRANSIT",
            codCollected: 0,
            codStatus: "PENDING",
          },
        });
      }

      await db.orderEvent.create({
        data: {
          orderId: order.id,
          type: "ASSIGNED",
          actorType: "ADMIN",
          actorName: `Smart Dispatch (${admin.name})`,
          message: `Assigné automatiquement au livreur ${chosen.employeeCode}`,
        },
      });

      chosen.deliveries.push({ id: `temp-${dispatchedCount}` });
      dispatchedCount++;
    }

    await audit({
      actorId: admin.id,
      actorName: admin.name,
      actorType: "ADMIN",
      action: "SMART_DISPATCH_EXECUTED",
      entity: "Order",
      entityId: "BATCH",
      meta: `${dispatchedCount} colis assignés automatiquement`,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/deliveries");
    return { ok: true, data: { count: dispatchedCount } };
  } catch (e) { return fail(e); }
}

/** Get structured list of merchant payouts for Moroccan bank export (RIB 24) */
export async function getBulkSettlementExportDataAction(): Promise<AdminResult> {
  try {
    await requireAdmin();
    const merchants = await db.merchant.findMany({
      where: { walletBalance: { gte: 20000 } }, // >= 200 DH
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        walletBalance: true,
        settlementCycle: true,
      },
      orderBy: { walletBalance: "desc" },
    });

    const bankKeys = merchants.map((m) => `merchant_bank_${m.id}`);
    const bankSettings = await db.setting.findMany({
      where: { key: { in: bankKeys } },
    });
    const bankMap = new Map<string, { bankName: string; rib: string; accountHolder: string }>();
    for (const s of bankSettings) {
      try {
        const mId = s.key.replace("merchant_bank_", "");
        bankMap.set(mId, JSON.parse(s.value));
      } catch {}
    }

    const rows = merchants.map((m) => {
      const bank = bankMap.get(m.id);
      return {
        merchantId: m.id,
        merchantName: m.name,
        phone: m.phone,
        city: m.city,
        amountCentimes: m.walletBalance,
        amountDh: m.walletBalance / 100,
        hasRib: !!bank?.rib,
        bankName: bank?.bankName ?? "Non renseigné",
        rib: bank?.rib ?? "",
        accountHolder: bank?.accountHolder ?? m.name,
      };
    });

    return { ok: true, data: rows };
  } catch (e) { return fail(e); }
}
