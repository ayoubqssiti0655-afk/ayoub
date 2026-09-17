import { db } from "@/server/db";
import { api, ok, notFound } from "@/lib/api";

/** Public tracking endpoint — no auth. Rate limited. */
export const GET = api<{ reference: string }>(
  async (_req, { params }) => {
    const order = await db.order.findUnique({
      where: { reference: params.reference.toUpperCase() },
      select: {
        reference: true, status: true, paymentMethod: true, codAmount: true,
        deliveryCity: true, createdAt: true, etaDate: true, deliveredAt: true, updatedAt: true,
        merchant: { select: { name: true } },
        courier: { select: { user: { select: { name: true } } } },
        delivery: { select: { outForDeliveryAt: true, deliveredAt: true, attempts: true } },
        events: { orderBy: { createdAt: "desc" }, take: 15, select: { type: true, message: true, createdAt: true } },
      },
    });
    if (!order) throw notFound("Tracking number not found");
    return ok({
      reference: order.reference,
      status: order.status,
      merchant: order.merchant.name,
      city: order.deliveryCity,
      paymentMethod: order.paymentMethod,
      codAmount: order.codAmount,
      createdAt: order.createdAt,
      etaDate: order.etaDate,
      deliveredAt: order.deliveredAt,
      lastUpdate: order.updatedAt,
      courier: order.status === "OUT_FOR_DELIVERY" && order.courier ? order.courier.user.name : null,
      attempts: order.delivery?.attempts ?? 0,
      events: order.events,
    });
  },
  { public: true, rate: { limit: 60, windowMs: 60000 } }
);
