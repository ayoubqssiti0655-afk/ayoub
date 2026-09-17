import type { Customer } from "@prisma/client";

export type TrustBand = "reliable" | "neutral" | "watch" | "risky" | "new";
export type TrustScore = {
  score: number; // 0–100
  band: TrustBand;
  delivered: number;
  failed: number;
  returned: number;
};

/**
 * Trust score for COD fraud prevention. Deterministic, explainable:
 * history of successful deliveries lifts the score; refusals and failed
 * attempts (fake orders, unreachable customers) drag it down.
 */
export function computeTrustScore(c: Pick<Customer, "totalOrders" | "failedCount" | "returnedCount" | "totalSpent">): TrustScore {
  const delivered = Math.max(0, c.totalOrders - c.failedCount - c.returnedCount);
  if (c.totalOrders === 0) return { score: 50, band: "new", delivered: 0, failed: 0, returned: 0 };

  let score = 42;
  score += Math.min(38, delivered * 13);          // successful deliveries build trust fast
  score -= Math.min(45, c.failedCount * 14);      // unreachable / wrong address
  score -= Math.min(50, c.returnedCount * 22);    // refused parcels are the worst signal
  if (c.totalOrders >= 3 && c.failedCount === 0 && c.returnedCount === 0) score += 8;
  if (c.totalSpent > 500_000) score += 4;         // > 5 000 DH lifetime value
  score = Math.max(0, Math.min(100, Math.round(score)));

  const band: TrustBand = score >= 75 ? "reliable" : score >= 50 ? "neutral" : score >= 30 ? "watch" : "risky";
  return { score, band, delivered, failed: c.failedCount, returned: c.returnedCount };
}
