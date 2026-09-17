import { cache } from "react";
import { db } from "@/server/db";

/**
 * Feature flags registry — the single place to declare platform capabilities.
 * Every advanced feature registers here: the admin Features page renders a
 * toggle for each entry, and server code gates itself via isFeatureEnabled().
 * To add a future feature: append to FEATURES, gate your code, done.
 */
export type FeatureCategory = "admin" | "courier" | "merchant" | "logistics_ai" | "finance" | "communication";

export const FEATURES = [
  // Admin & Central Operations
  { key: "admin_control_tower", icon: "RadioTower", category: "admin" },
  { key: "admin_central_caisse", icon: "Landmark", category: "admin" },
  { key: "admin_smart_dispatch", icon: "Sparkles", category: "admin" },
  { key: "admin_risk_radar", icon: "ShieldAlert", category: "admin" },
  { key: "admin_bank_settlement_export", icon: "FileSpreadsheet", category: "admin" },
  { key: "staff_permissions", icon: "UserCog", category: "admin" },
  { key: "anomaly_alerts", icon: "Siren", category: "admin" },
  { key: "disputes", icon: "Scale", category: "admin" },

  // Courier & Field Logistics
  { key: "courier_quick_actions", icon: "Navigation", category: "courier" },
  { key: "courier_cash_pocket", icon: "Receipt", category: "courier" },
  { key: "courier_batch_scan", icon: "ScanLine", category: "courier" },
  { key: "courier_closure", icon: "CheckSquare", category: "courier" },
  { key: "delivery_control_center", icon: "Truck", category: "courier" },
  { key: "cash_reconciliation", icon: "Wallet", category: "courier" },
  { key: "pwa_alerts", icon: "BellRing", category: "courier" },
  { key: "post_delivery_rating", icon: "Star", category: "courier" },

  // Merchant & Orders Management
  { key: "confirmation_queue", icon: "PhoneCall", category: "merchant" },
  { key: "storefront", icon: "Store", category: "merchant" },
  { key: "stock_management", icon: "Boxes", category: "merchant" },
  { key: "qr_labels", icon: "ScanLine", category: "merchant" },
  { key: "exchange_orders", icon: "RefreshCcw", category: "merchant" },
  { key: "weight_capture", icon: "Weight", category: "merchant" },
  { key: "invoices", icon: "FileText", category: "merchant" },
  { key: "promo_codes", icon: "TicketPercent", category: "merchant" },

  // AI & Smart Logistics
  { key: "auto_dispatch", icon: "Wand2", category: "logistics_ai" },
  { key: "address_iq", icon: "Brain", category: "logistics_ai" },
  { key: "trust_score", icon: "ShieldCheck", category: "logistics_ai" },
  { key: "demand_forecast", icon: "ChartLine", category: "logistics_ai" },
  { key: "insights", icon: "Sparkles", category: "logistics_ai" },
  { key: "hub_bags", icon: "PackageOpen", category: "logistics_ai" },
  { key: "pickup_points", icon: "MapPinned", category: "logistics_ai" },
  { key: "delivery_slots", icon: "CalendarClock", category: "logistics_ai" },

  // Finance & Payments
  { key: "instant_payout", icon: "Zap", category: "finance" },
  { key: "online_payment", icon: "CreditCard", category: "finance" },
  { key: "payout_frequency", icon: "CalendarClock", category: "finance" },

  // Customer Communication & Tracking
  { key: "whatsapp", icon: "MessageCircle", category: "communication" },
  { key: "live_tracking", icon: "RadioTower", category: "communication" },
  { key: "daily_digest", icon: "Newspaper", category: "communication" },
  { key: "tickets", icon: "LifeBuoy", category: "communication" },
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
