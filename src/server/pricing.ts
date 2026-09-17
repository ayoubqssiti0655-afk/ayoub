import { db } from "@/server/db";

export type PricingConfig = {
  weightSurchargePerKg: number; // centimes per extra kg above 1kg
  remoteMultiplier: number;
  codFeePct: number; // % of parcel value
  courierFeeDefault: number; // centimes paid to courier per delivered parcel
};

export async function getPricingConfig(): Promise<PricingConfig> {
  const rows = await db.setting.findMany({ where: { key: { in: ["weight_surcharge_per_kg", "remote_multiplier", "cod_fee_pct", "courier_fee_default"] } } });
  const map = new Map(rows.map((r) => [r.key, Number(r.value)]));
  return {
    weightSurchargePerKg: map.get("weight_surcharge_per_kg") ?? 500,
    remoteMultiplier: map.get("remote_multiplier") ?? 1.25,
    codFeePct: map.get("cod_fee_pct") ?? 0,
    courierFeeDefault: map.get("courier_fee_default") ?? 1400,
  };
}

export async function setPricingConfig(patch: Partial<PricingConfig>) {
  const entries: [string, string][] = [];
  if (patch.weightSurchargePerKg != null) entries.push(["weight_surcharge_per_kg", String(patch.weightSurchargePerKg)]);
  if (patch.remoteMultiplier != null) entries.push(["remote_multiplier", String(patch.remoteMultiplier)]);
  if (patch.codFeePct != null) entries.push(["cod_fee_pct", String(patch.codFeePct)]);
  if (patch.courierFeeDefault != null) entries.push(["courier_fee_default", String(patch.courierFeeDefault)]);
  for (const [key, value] of entries) {
    await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
}

export type QuoteInput = {
  cityFr: string;
  weightKg?: number;
  isReturn?: boolean;
  merchantConfig?: string | null; // merchant pricingConfig JSON overrides
};

export type Quote = {
  baseFee: number;
  surcharges: number;
  total: number;
  returnFee: number;
  etaHours: number;
  zoneId: string | null;
  city: string;
  isRemote: boolean;
};

/**
 * Delivery fee = zone fee (+ weight surcharge per extra kg, × remote multiplier).
 * Returns are charged at the zone return fee.
 */
export async function quoteDelivery(input: QuoteInput): Promise<Quote> {
  const city = await db.city.findFirst({
    where: { nameFr: input.cityFr },
    include: { zones: { where: { isActive: true }, orderBy: { deliveryFee: "asc" } } },
  });
  const config = await getPricingConfig();
  const zone = city?.zones[0] ?? null;
  const baseFee = zone?.deliveryFee ?? 3500;
  const weightKg = Math.max(0, (input.weightKg ?? 1) - 1);
  let surcharges = Math.ceil(weightKg) * config.weightSurchargePerKg;
  if (city?.isRemote) surcharges += Math.round(baseFee * (config.remoteMultiplier - 1));
  const returnFee = zone?.returnFee ?? Math.max(1500, Math.round(baseFee * 0.6));
  return {
    baseFee,
    surcharges,
    total: baseFee + surcharges,
    returnFee,
    etaHours: zone?.etaHours ?? 48,
    zoneId: zone?.id ?? null,
    city: city?.nameFr ?? input.cityFr,
    isRemote: city?.isRemote ?? false,
  };
}
