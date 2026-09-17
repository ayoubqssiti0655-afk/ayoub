// Domain constants — single source of truth for statuses & roles.

export const ROLES = ["ADMIN", "MERCHANT", "MERCHANT_STAFF", "COURIER"] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUSES = [
  "NEW", "CONFIRMED", "READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT",
  "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED", "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const DELIVERY_STATUSES = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURN_IN_TRANSIT", "RETURNED"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const RETURN_STATUSES = ["REQUESTED", "ASSIGNED", "IN_TRANSIT", "RECEIVED", "COMPLETED"] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const COD_TYPES = ["COD_COLLECTION", "DELIVERY_FEE", "RETURN_FEE", "ADJUSTMENT", "SETTLEMENT"] as const;
export const COD_STATUSES = ["PENDING", "AVAILABLE", "SETTLED"] as const;

export const FAIL_REASONS = ["NO_ANSWER", "WRONG_ADDRESS", "POSTPONED", "REFUSED", "OUT_OF_ZONE", "UNREACHABLE"] as const;
export type FailReason = (typeof FAIL_REASONS)[number];

export const MERCHANT_STATUSES = ["ACTIVE", "PENDING", "SUSPENDED"] as const;
export const PLANS = ["starter", "growth", "scale"] as const;
export const SETTLEMENT_STATUSES = ["PENDING", "PROCESSING", "PAID"] as const;
export const SETTLEMENT_CYCLES = ["WEEKLY", "BIWEEKLY", "MONTHLY"] as const;
export const VEHICLES = ["MOTORCYCLE", "CAR", "VAN"] as const;
export const SOURCES = ["DASHBOARD", "API", "SHOPIFY", "WOOCOMMERCE", "PRESTASHOP"] as const;

export const WEBHOOK_EVENTS = [
  "order.created", "order.confirmed", "order.delivered", "order.failed", "order.returned", "return.completed", "settlement.paid",
] as const;

export const NOTIFICATION_EVENTS = [
  "ORDER_CREATED", "ORDER_CONFIRMED", "COURIER_ASSIGNED", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED", "SETTLEMENT_AVAILABLE", "SYSTEM",
] as const;

/** Allowed order status transitions (guard rails for state machine). */
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["READY_FOR_PICKUP", "CANCELLED"],
  READY_FOR_PICKUP: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "FAILED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
  FAILED: ["IN_TRANSIT", "RETURNED"],
  RETURNED: [],
  DELIVERED: [],
  CANCELLED: [],
};

export const ACTIVE_STATUSES: OrderStatus[] = ["NEW", "CONFIRMED", "READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"];
export const INFO_STATUSES: OrderStatus[] = ["CONFIRMED", "READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"];

export function statusTone(status: string): "success" | "warning" | "error" | "info" | "neutral" | "violet" | "primary" {
  switch (status) {
    case "DELIVERED": return "success";
    case "NEW": case "FAILED": return "error";
    case "RETURNED": return "violet";
    case "CANCELLED": case "WAIVED": return "neutral";
    case "CONFIRMED": case "READY_FOR_PICKUP": case "PICKED_UP": case "IN_TRANSIT": case "OUT_FOR_DELIVERY":
    case "ASSIGNED": case "REQUESTED": case "PENDING": case "PROCESSING": return "info";
    case "RECEIVED": case "COMPLETED": case "PAID": case "SETTLED": case "COLLECTED": case "AVAILABLE": return "success";
    default: return "neutral";
  }
}

export function isTerminal(status: string) {
  return ["DELIVERED", "RETURNED", "CANCELLED"].includes(status);
}
