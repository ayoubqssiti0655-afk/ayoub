import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { api, ok } from "@/lib/api";
import { computeTrustScore } from "@/server/trust";
import { isFeatureEnabled } from "@/server/features";

/** Customer lookup by phone for the order form — trust score + autofill. */
export const GET = api(
  async (req: NextRequest, { merchantId }) => {
    const raw = (req.nextUrl.searchParams.get("phone") ?? "").replace(/\s/g, "");
    if (raw.length < 9) return ok({ found: false });
    const phone = raw.startsWith("0") ? "+212" + raw.slice(1) : raw;
    const customer = await db.customer.findFirst({
      where: { merchantId: merchantId!, phone: { in: [phone, raw] } },
    });
    if (!customer) return ok({ found: false, trustEnabled: await isFeatureEnabled("trust_score") });
    const trustEnabled = await isFeatureEnabled("trust_score");
    const trust = trustEnabled ? computeTrustScore(customer) : null;
    return ok({
      found: true,
      id: customer.id,
      fullName: customer.fullName,
      city: customer.city,
      address: customer.address,
      notes: customer.notes,
      trust,
      trustEnabled,
    });
  },
  { auth: ["MERCHANT", "MERCHANT_STAFF"], rate: { limit: 60, windowMs: 60000 } }
);
