import { NextRequest } from "next/server";
import { z } from "zod";
import { api, parseBody, ok, forbidden } from "@/lib/api";
import { isFeatureEnabled, FEATURE_DISABLED_MSG } from "@/server/features";
import { autoAssignOrders } from "@/server/dispatch";

/** Bulk smart dispatch — auto-pick the best courier per parcel. */
export const POST = api(
  async (req: NextRequest, { merchantId, session }) => {
    const body = await parseBody(req, z.object({ orderIds: z.array(z.string()).min(1).max(50) }));
    if (!(await isFeatureEnabled("auto_dispatch"))) throw forbidden(FEATURE_DISABLED_MSG);
    const results = await autoAssignOrders(
      body.orderIds,
      merchantId!,
      { id: session!.sub, name: session!.name, type: "MERCHANT" }
    );
    const okCount = results.filter((r) => r.ok).length;
    return ok({ assigned: okCount, failed: results.length - okCount, results });
  },
  { auth: ["MERCHANT", "MERCHANT_STAFF"], rate: { limit: 30, windowMs: 60000 } }
);
