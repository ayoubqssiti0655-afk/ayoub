import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { api, parseBody, ok, pagination, forbidden } from "@/lib/api";
import { createOrder } from "@/server/orders";
import { listOrders } from "@/server/queries";

const createSchema = z.object({
  customer: z.object({
    fullName: z.string().min(3),
    phone: z.string().min(9),
    secondaryPhone: z.string().optional(),
    city: z.string().min(2),
    address: z.string().min(5),
    postalCode: z.string().optional(),
    notes: z.string().optional(),
  }),
  items: z.array(z.object({
    productId: z.string().optional(),
    name: z.string().min(1),
    sku: z.string().optional(),
    quantity: z.number().int().min(1).max(99).default(1),
    unitPrice: z.number().int().min(1), // centimes
  })).min(1),
  shippingFee: z.number().int().min(0).optional(),
  discount: z.number().int().min(0).default(0),
  paymentMethod: z.enum(["COD", "PREPAID"]).default("COD"),
  source: z.enum(["API", "SHOPIFY", "WOOCOMMERCE", "PRESTASHOP", "YOUCAN", "EXCEL_IMPORT"]).default("API"),
});

export const GET = api(
  async (req: NextRequest, { merchantId, session }) => {
    const merchant = session?.role === "ADMIN" ? null : merchantId;
    if (session && !merchantId && session.role !== "ADMIN") throw forbidden();
    const sp = req.nextUrl.searchParams;
    const { page, per, skip, take } = pagination(req);
    const result = await listOrders(merchant, {
      q: sp.get("q") ?? undefined,
      status: sp.get("status") ?? undefined,
      city: sp.get("city") ?? undefined,
      courier: sp.get("courier") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      sort: sp.get("sort") ?? undefined,
      page, per,
    });
    void skip; void take;
    return ok({
      total: result.total,
      page: result.page,
      per: result.per,
      orders: result.rows.map((o) => ({
        id: o.id,
        reference: o.reference,
        status: o.status,
        paymentMethod: o.paymentMethod,
        total: o.total,
        codAmount: o.codAmount,
        city: o.deliveryCity,
        customer: { name: o.customer.fullName, phone: o.customer.phone },
        courier: o.courier?.user.name ?? null,
        createdAt: o.createdAt,
      })),
    });
  },
  { auth: ["MERCHANT", "MERCHANT_STAFF", "ADMIN"], apiKey: true, rate: { limit: 120, windowMs: 60000 } }
);

export const POST = api(
  async (req: NextRequest, { merchantId }) => {
    if (!merchantId) throw forbidden();
    const body = await parseBody(req, createSchema);
    const order = await createOrder({
      merchantId,
      customer: { ...body.customer, phone: body.customer.phone.replace(/^0/, "+212") },
      items: body.items,
      shippingFee: body.shippingFee,
      discount: body.discount,
      paymentMethod: body.paymentMethod,
      source: body.source,
    });
    return ok({
      id: order.id,
      reference: order.reference,
      status: order.status,
      total: order.total,
      codAmount: order.codAmount,
      trackingUrl: `/track?ref=${order.reference}`,
    });
  },
  { apiKey: true, rate: { limit: 60, windowMs: 60000 } }
);
