import { api, ok, forbidden } from "@/lib/api";
import { isFeatureEnabled, FEATURE_DISABLED_MSG } from "@/server/features";
import { buildDigest } from "@/server/digest";
import { db } from "@/server/db";

/** Digest preview for the merchant dashboard + send-now button target. */
export const GET = api(
  async (_req, { merchantId }) => {
    if (!(await isFeatureEnabled("daily_digest"))) throw forbidden(FEATURE_DISABLED_MSG);
    return ok(await buildDigest(merchantId!));
  },
  { auth: ["MERCHANT", "MERCHANT_STAFF"] }
);

export const POST = api(
  async (_req, { merchantId }) => {
    if (!(await isFeatureEnabled("daily_digest"))) throw forbidden(FEATURE_DISABLED_MSG);
    const { sendDigest } = await import("@/server/digest");
    const staff = await db.merchantStaff.findFirst({ where: { merchantId: merchantId! }, include: { user: { select: { name: true } } } });
    const d = await sendDigest(merchantId!);
    return ok({ sent: true, digest: d, actor: staff?.user.name });
  },
  { auth: ["MERCHANT", "MERCHANT_STAFF"], rate: { limit: 5, windowMs: 60000 } }
);
