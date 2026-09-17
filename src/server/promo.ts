import { db } from "@/server/db";
import { badRequest, notFound } from "@/lib/api";

/** Validate + consume a promo code for an order. Returns the discount in centimes. */
export async function applyPromo(merchantId: string, code: string, itemsTotal: number) {
  const promo = await db.promoCode.findUnique({
    where: { merchantId_code: { merchantId, code: code.trim().toUpperCase() } },
  });
  if (!promo || !promo.isActive) throw notFound("Promo code not found");
  if (promo.expiresAt && promo.expiresAt < new Date()) throw badRequest("Code expiré");
  if (promo.maxUses > 0 && promo.uses >= promo.maxUses) throw badRequest("Code épuisé");

  let discount = 0;
  if (promo.type === "PERCENT") discount = Math.round((itemsTotal * promo.value) / 100);
  else discount = Math.min(promo.value, itemsTotal);

  await db.promoCode.update({ where: { id: promo.id }, data: { uses: { increment: 1 } } });
  return { code: promo.code, discount };
}

export async function listPromos(merchantId: string) {
  return db.promoCode.findMany({ where: { merchantId }, orderBy: { createdAt: "desc" }, take: 50 });
}

export async function createPromo(merchantId: string, input: { code: string; type: "PERCENT" | "FIXED"; value: number; maxUses?: number; expiresAt?: Date }) {
  const code = input.code.trim().toUpperCase();
  const exists = await db.promoCode.findUnique({ where: { merchantId_code: { merchantId, code } } });
  if (exists) throw badRequest("Ce code existe déjà");
  return db.promoCode.create({
    data: {
      merchantId, code, type: input.type, value: input.value,
      maxUses: input.maxUses ?? 0, expiresAt: input.expiresAt ?? null,
    },
  });
}

export async function togglePromo(merchantId: string, id: string, isActive: boolean) {
  await db.promoCode.updateMany({ where: { id, merchantId }, data: { isActive } });
}
