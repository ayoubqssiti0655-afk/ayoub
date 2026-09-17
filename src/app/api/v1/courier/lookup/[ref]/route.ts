import { db } from "@/server/db";
import { api, ok, notFound, forbidden, badRequest } from "@/lib/api";
import { isFeatureEnabled, FEATURE_DISABLED_MSG } from "@/server/features";
import { assignCourier } from "@/server/orders";

/** QR-scan target: resolve a parcel reference to courier's tour or auto-assign warehouse unassigned parcels. */
export const GET = api<{ ref: string }>(
  async (_req, { params, session }) => {
    const courierId = session!.courierId;
    if (!(await isFeatureEnabled("qr_labels"))) throw forbidden(FEATURE_DISABLED_MSG);
    if (!courierId) throw forbidden("المستخدم ليس موزعاً معتمداً");

    const cleanRef = decodeURIComponent(params.ref).trim().toUpperCase();

    // 1. Check if already in this courier's tour
    const delivery = await db.delivery.findFirst({
      where: {
        courierId,
        order: { reference: cleanRef },
      },
      include: { order: { select: { reference: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });

    if (delivery) {
      return ok({
        deliveryId: delivery.id,
        reference: delivery.order.reference,
        status: delivery.status,
        alreadyAssigned: true,
      });
    }

    // 2. Check if the order exists in the database
    const order = await db.order.findUnique({
      where: { reference: cleanRef },
      include: {
        courier: { include: { user: true } },
      },
    });

    if (!order) {
      throw notFound(`الرمز ${cleanRef} غير موجود بالنظام. يرجى التأكد من صحة رقم الطرد.`);
    }

    // 3. If already assigned to another courier
    if (order.courierId && order.courierId !== courierId) {
      const otherName = order.courier?.user?.name ?? "موزع آخر";
      throw badRequest(`هذا الطرد مسند بالفعل لموزع آخر (${otherName}). لا يمكنك استلامه.`);
    }

    // 4. If cancelled or already returned
    if (order.status === "CANCELLED" || order.status === "RETURNED") {
      throw badRequest(`لا يمكن استلام هذا الطرد لأنه بحالة (${order.status}).`);
    }

    // 5. Order is confirmed/ready and unassigned: Auto-intake / assign to courier upon warehouse scan!
    await assignCourier(order.id, courierId, {
      id: session!.sub,
      name: session!.name ?? "Courier",
      type: "COURIER",
    });

    const newDelivery = await db.delivery.findFirst({
      where: { courierId, orderId: order.id },
      include: { order: { select: { reference: true, status: true } } },
    });

    return ok({
      deliveryId: newDelivery?.id,
      reference: order.reference,
      status: newDelivery?.status ?? "ASSIGNED",
      autoAssigned: true,
    });
  },
  { auth: ["COURIER"] }
);

