import { NextRequest } from "next/server";
import { z } from "zod";
import { api, parseBody, ok, forbidden } from "@/lib/api";
import { isFeatureEnabled, FEATURE_DISABLED_MSG } from "@/server/features";
import { receiveBag } from "@/server/bags";

/** Courier receives a sealed hub bag with its seal code. */
export const POST = api<{ id: string }>(
  async (req: NextRequest, { params, session }) => {
    const courierId = session!.courierId;
    if (!courierId) throw forbidden();
    if (!(await isFeatureEnabled("hub_bags"))) throw forbidden(FEATURE_DISABLED_MSG);
    const body = await parseBody(req, z.object({ sealCode: z.string().min(3).max(8) }));
    const result = await receiveBag(params.id, body.sealCode, courierId, { name: session!.name });
    return ok(result);
  },
  { auth: ["COURIER"], rate: { limit: 20, windowMs: 60000 } }
);
