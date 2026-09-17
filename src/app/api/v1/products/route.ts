import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { api, ok, pagination, forbidden } from "@/lib/api";

export const GET = api(
  async (req: NextRequest, { merchantId, session }) => {
    if (!merchantId && session?.role !== "ADMIN") throw forbidden();
    const { skip, take } = pagination(req, 50);
    const sp = req.nextUrl.searchParams;
    const products = await db.product.findMany({
      where: {
        ...(merchantId ? { merchantId } : {}),
        ...(sp.get("q") ? { name: { contains: sp.get("q")! } } : {}),
        ...(sp.get("category") ? { category: sp.get("category")! } : {}),
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
    return ok({ products: products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, category: p.category, price: p.price, stock: p.stock, active: p.isActive })) });
  },
  { auth: ["MERCHANT", "MERCHANT_STAFF", "ADMIN"], apiKey: true }
);
