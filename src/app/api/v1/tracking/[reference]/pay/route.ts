import { NextRequest } from "next/server";
import { z } from "zod";
import { api, parseBody, ok, forbidden } from "@/lib/api";
import { isFeatureEnabled, FEATURE_DISABLED_MSG } from "@/server/features";
import { payOrderOnline } from "@/server/payments";

const cardSchema = z.object({
  number: z.string().min(12).max(23),
  exp: z.string().regex(/^\d{2}\/\d{2}$/),
  cvc: z.string().regex(/^\d{3,4}$/),
});

/** Prepay a COD parcel online (CMI simulation). Public but rate-limited. */
export const POST = api<{ reference: string }>(
  async (req: NextRequest, { params }) => {
    const body = await parseBody(req, cardSchema);
    if (!(await isFeatureEnabled("online_payment"))) throw forbidden(FEATURE_DISABLED_MSG);
    const result = await payOrderOnline(decodeURIComponent(params.reference).toUpperCase(), body);
    return ok({ paid: true, transactionId: result.transactionId, provider: "CMI (simulation)", amount: result.amount });
  },
  { public: true, rate: { limit: 10, windowMs: 60000 } }
);
