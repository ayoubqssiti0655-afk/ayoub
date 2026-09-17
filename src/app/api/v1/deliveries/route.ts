import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { api, ok, pagination, forbidden } from "@/lib/api";

export const GET = api(
  async (req: NextRequest, { merchantId, session }) => {
    if (!merchantId && session?.role !== "ADMIN") throw forbidden();
    const { skip, take } = pagination(req, 50);
    const deliveries = await db.delivery.findMany({
      where: {
        ...(merchantId ? { order: { merchantId } } : {}),
        ...(req.nextUrl.searchParams.get("status") ? { status: req.nextUrl.searchParams.get("status")! } : {}),
      },
      include: { order: { include: { customer: { select: { fullName: true } } } }, courier: { include: { user: { select: { name: true } } } } },
      orderBy: { updatedAt: "desc" },
      skip,
      take,
    });
    return ok({
      deliveries: deliveries.map((d) => ({
        id: d.id, order: d.order.reference, customer: d.order.customer.fullName,
        city: d.order.deliveryCity, status: d.status, attempts: d.attempts,
        codAmount: d.order.codAmount, codStatus: d.codStatus,
        courier: d.courier?.user.name ?? null, updatedAt: d.updatedAt,
      })),
    });
  },
  { auth: ["MERCHANT", "MERCHANT_STAFF", "ADMIN"], apiKey: true }
);
