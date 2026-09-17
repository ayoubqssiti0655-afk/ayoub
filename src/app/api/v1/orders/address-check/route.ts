import { NextRequest } from "next/server";
import { z } from "zod";
import { api, parseBody, ok } from "@/lib/api";
import { isFeatureEnabled } from "@/server/features";
import { checkAddress } from "@/server/address-iq";

/** Address IQ — quality check for the order form. */
export const POST = api(
  async (req: NextRequest, { merchantId }) => {
    if (!(await isFeatureEnabled("address_iq"))) return ok({ enabled: false });
    const body = await parseBody(req, z.object({ address: z.string().max(300), city: z.string().optional() }));
    return ok({ enabled: true, ...checkAddress(body.address, body.city) });
  },
  { auth: ["MERCHANT", "MERCHANT_STAFF"], rate: { limit: 60, windowMs: 60000 } }
);
