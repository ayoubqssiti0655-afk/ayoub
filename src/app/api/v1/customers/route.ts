import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { api, ok, pagination, forbidden } from "@/lib/api";

export const GET = api(
  async (req: NextRequest, { merchantId, session }) => {
    if (!merchantId && session?.role !== "ADMIN") throw forbidden();
    const { skip, take } = pagination(req, 50);
    const customers = await db.customer.findMany({
      where: merchantId ? { merchantId } : {},
      orderBy: { totalOrders: "desc" },
      skip,
      take,
    });
    return ok({
      customers: customers.map((c) => ({
        id: c.id, fullName: c.fullName, phone: c.phone, city: c.city,
        orders: c.totalOrders, totalSpent: c.totalSpent,
      })),
    });
  },
  { auth: ["MERCHANT", "MERCHANT_STAFF", "ADMIN"], apiKey: true }
);
