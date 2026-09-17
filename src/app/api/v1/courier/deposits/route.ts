import { NextRequest } from "next/server";
import { z } from "zod";
import { api, parseBody, ok, forbidden } from "@/lib/api";
import { isFeatureEnabled, FEATURE_DISABLED_MSG } from "@/server/features";
import { cashSummary, declareDeposit } from "@/server/cash";

export const GET = api(
  async (_req, { session }) => {
    const courierId = session!.courierId;
    if (!courierId) throw forbidden();
    if (!(await isFeatureEnabled("cash_reconciliation"))) throw forbidden(FEATURE_DISABLED_MSG);
    return ok(await cashSummary(courierId));
  },
  { auth: ["COURIER"] }
);

export const POST = api(
  async (req: NextRequest, { session }) => {
    const courierId = session!.courierId;
    if (!courierId) throw forbidden();
    if (!(await isFeatureEnabled("cash_reconciliation"))) throw forbidden(FEATURE_DISABLED_MSG);
    const body = await parseBody(
      req,
      z.object({
        amount: z.number().int().min(0),
        proofPhoto: z.string().max(400000).optional(),
        note: z.string().max(300).optional(),
      })
    );
    const deposit = await declareDeposit(courierId, body);
    return ok({ id: deposit.id, difference: deposit.difference });
  },
  { auth: ["COURIER"], rate: { limit: 10, windowMs: 60000 } }
);
