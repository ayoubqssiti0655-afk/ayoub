import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createOrder } from "@/server/orders";

export async function POST(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const apiKeyRaw = sp.get("key") ?? req.headers.get("x-api-key");
    const merchantIdParam = sp.get("merchantId");

    let merchantId = merchantIdParam;

    if (!merchantId && apiKeyRaw) {
      const apiKey = await db.apiKey.findFirst({
        where: { prefix: apiKeyRaw.slice(0, 8), revokedAt: null },
      });
      if (apiKey) {
        merchantId = apiKey.merchantId;
      }
    }

    if (!merchantId) {
      return NextResponse.json(
        { error: "Invalid API key or merchantId" },
        { status: 401 }
      );
    }

    const payload = await req.json();

    // YouCan order webhook payload format
    // Customer info: payload.customer or payload.shipping_address
    const customer = payload.customer ?? {};
    const shipping = payload.shipping_address ?? payload.shippingAddress ?? {};

    const fullName =
      `${shipping.first_name ?? customer.first_name ?? ""} ${shipping.last_name ?? customer.last_name ?? ""}`.trim() ||
      customer.name ||
      shipping.name ||
      "Client YouCan";

    let phone = (shipping.phone ?? customer.phone ?? "").replace(/[\s\-]/g, "");
    if (phone.startsWith("0")) phone = "+212" + phone.slice(1);
    else if (!phone.startsWith("+212") && phone.length >= 9) phone = "+212" + phone;

    const city = shipping.city ?? customer.city ?? "Casablanca";
    const address = shipping.address1 ?? shipping.address ?? customer.address ?? city;

    // Line items
    const lineItems = Array.isArray(payload.order_variants ?? payload.items)
      ? (payload.order_variants ?? payload.items).map((it: any) => ({
          name: it.product_name ?? it.name ?? "Article YouCan",
          quantity: Number(it.quantity ?? 1),
          unitPrice: Math.round(Number(it.price ?? it.unit_price ?? 0) * 100),
        }))
      : [
          {
            name: "Commande YouCan",
            quantity: 1,
            unitPrice: Math.round(Number(payload.total ?? payload.total_price ?? 0) * 100),
          },
        ];

    const totalInCentimes = Math.round(Number(payload.total ?? payload.total_price ?? 0) * 100);

    const order = await createOrder({
      merchantId,
      customer: {
        fullName,
        phone,
        city,
        address,
        notes: payload.notes ?? payload.note,
      },
      items: lineItems,
      shippingFee: Math.round(Number(payload.shipping_cost ?? 0) * 100),
      paymentMethod: payload.payment_method === "ONLINE" ? "PREPAID" : "COD",
      notes: `YouCan #${payload.id ?? payload.order_number ?? ""}`,
      source: "YOUCAN",
    });

    return NextResponse.json({
      success: true,
      reference: order.reference,
      orderId: order.id,
    });
  } catch (err: any) {
    console.error("[YouCan webhook error]", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}

