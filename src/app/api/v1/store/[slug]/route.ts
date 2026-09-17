import { NextRequest } from "next/server";
import { z } from "zod";
import { api, parseBody, ok } from "@/lib/api";
import { isFeatureEnabled } from "@/server/features";
import { getStore, createStorefrontOrder } from "@/server/storefront";
import { applyPromo } from "@/server/promo";
import { db } from "@/server/db";

export const GET = api<{ slug: string }>(
  async (_req, { params }) => {
    if (!(await isFeatureEnabled("storefront"))) return ok({ enabled: false });
    const store = await getStore(decodeURIComponent(params.slug));
    return ok({ enabled: true, ...store });
  },
  { public: true, rate: { limit: 120, windowMs: 60000 } }
);

const orderSchema = z.object({
  productId: z.string(),
  fullName: z.string().min(3).max(120),
  phone: z.string().min(9).max(20),
  city: z.string().min(2),
  address: z.string().min(5).max(300),
  quantity: z.number().int().min(1).max(10).default(1),
  notes: z.string().max(300).optional(),
  promoCode: z.string().max(20).optional(),
});

/** Public COD checkout from the storefront. */
export const POST = api<{ slug: string }>(
  async (req: NextRequest, { params }) => {
    if (!(await isFeatureEnabled("storefront"))) {
      return ok({ ok: false, message: "Storefront disabled" });
    }
    const slug = decodeURIComponent(params.slug);
    const body = await parseBody(req, orderSchema);
    const merchant = await db.merchant.findFirst({ where: { slug, status: "ACTIVE" }, select: { id: true } });
    if (!merchant) return ok({ ok: false, message: "Store not found" });
    const product = await db.product.findFirst({
      where: { id: body.productId, merchantId: merchant.id, isActive: true },
      select: { id: true, price: true },
    });
    if (!product) return ok({ ok: false, message: "Product not available" });

    let discount = 0;
    if (body.promoCode && (await isFeatureEnabled("promo_codes"))) {
      try {
        discount = (await applyPromo(merchant.id, body.promoCode, product.price * body.quantity)).discount;
      } catch { /* invalid code → no discount */ }
    }

    const order = await createStorefrontOrder(slug, body, discount);
    return ok({ ok: true, reference: order.reference, trackingUrl: order.trackingUrl, total: order.total });
  },
  { public: true, rate: { limit: 10, windowMs: 60000 } }
);
