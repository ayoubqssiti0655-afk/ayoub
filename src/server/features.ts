import { cache } from "react";
import { db } from "@/server/db";

/**
 * Feature flags registry — the single place to declare platform capabilities.
 * Every advanced feature registers here: the admin Features page renders a
 * toggle for each entry, and server code gates itself via isFeatureEnabled().
 * To add a future feature: append to FEATURES, gate your code, done.
 */
export const FEATURES = [
  { key: "whatsapp", icon: "MessageCircle" },
  { key: "trust_score", icon: "ShieldCheck" },
  { key: "auto_dispatch", icon: "Wand2" },
  { key: "cash_reconciliation", icon: "Wallet" },
  { key: "live_tracking", icon: "RadioTower" },
  { key: "qr_labels", icon: "ScanLine" },
  { key: "pwa_alerts", icon: "BellRing" },
  { key: "online_payment", icon: "CreditCard" },
  { key: "exchange_orders", icon: "RefreshCcw" },
  { key: "insights", icon: "Sparkles" },
  { key: "delivery_slots", icon: "CalendarClock" },
  { key: "hub_bags", icon: "PackageOpen" },
  { key: "instant_payout", icon: "Zap" },
  { key: "stock_management", icon: "Boxes" },
  { key: "post_delivery_rating", icon: "Star" },
  { key: "pickup_points", icon: "MapPinned" },
  { key: "address_iq", icon: "Brain" },
  { key: "daily_digest", icon: "Newspaper" },
  { key: "demand_forecast", icon: "ChartLine" },
  { key: "disputes", icon: "Scale" },
  { key: "storefront", icon: "Store" },
  { key: "confirmation_queue", icon: "PhoneCall" },
  { key: "tickets", icon: "LifeBuoy" },
  { key: "staff_permissions", icon: "UserCog" },
  { key: "invoices", icon: "FileText" },
  { key: "anomaly_alerts", icon: "Siren" },
  { key: "weight_capture", icon: "Weight" },
  { key: "promo_codes", icon: "TicketPercent" },
  { key: "delivery_control_center", icon: "Truck" },
  { key: "courier_quick_actions", icon: "Navigation" },
  { key: "courier_cash_pocket", icon: "Receipt" },
  { key: "courier_batch_scan", icon: "ScanLine" },
  { key: "courier_closure", icon: "CheckSquare" },
] as const;

export type FeatureKey = (typeof FEATURES)[number]["key"];
export type FeatureMap = Record<FeatureKey, boolean>;

const flagKey = (key: string) => `feature_${key}`;

/** All flags, per request. Defaults to enabled. */
export const getFeatureMap = cache(async (): Promise<FeatureMap> => {
  const rows = await db.setting.findMany({
    where: { key: { in: FEATURES.map((f) => flagKey(f.key)) } },
  });
  const off = new Set(rows.filter((r) => r.value === "off").map((r) => r.key));
  const map = {} as FeatureMap;
  for (const f of FEATURES) map[f.key] = !off.has(flagKey(f.key));
  return map;
});

export async function isFeatureEnabled(key: FeatureKey): Promise<boolean> {
  const map = await getFeatureMap();
  return map[key] ?? true;
}

export async function setFeatureEnabled(key: FeatureKey, enabled: boolean) {
  await db.setting.upsert({
    where: { key: flagKey(key) },
    create: { key: flagKey(key), value: enabled ? "on" : "off" },
    update: { value: enabled ? "on" : "off" },
  });
}

/** 403 helper message used by gated API routes. */
export const FEATURE_DISABLED_MSG = "This feature is currently disabled by the administrator.";
