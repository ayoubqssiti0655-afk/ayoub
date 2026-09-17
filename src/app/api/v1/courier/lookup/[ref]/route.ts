import { db } from "@/server/db";
import { api, ok, notFound, forbidden } from "@/lib/api";
import { isFeatureEnabled, FEATURE_DISABLED_MSG } from "@/server/features";

/** QR-scan target: resolve a parcel reference to the courier's own delivery. */
export const GET = api<{ ref: string }>(
  async (_req, { params, session }) => {
    const courierId = session!.courierId;
    if (!(await isFeatureEnabled("qr_labels"))) throw forbidden(FEATURE_DISABLED_MSG);
    if (!courierId) throw forbidden();
    const delivery = await db.delivery.findFirst({
      where: {
        courierId,
        order: { reference: decodeURIComponent(params.ref).toUpperCase() },
      },
      include: { order: { select: { reference: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
    if (!delivery) throw notFound("No parcel with this reference in your tour");
    return ok({ deliveryId: delivery.id, reference: delivery.order.reference, status: delivery.status });
  },
  { auth: ["COURIER"] }
);
