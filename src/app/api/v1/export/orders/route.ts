import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/server/db";
import { listOrders } from "@/server/queries";
import { toCsv } from "@/lib/utils";

/** CSV export (session auth). Follows the same filters as the orders table. */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !["MERCHANT", "MERCHANT_STAFF", "ADMIN"].includes(session.role)) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const result = await listOrders(session.merchantId ?? null, {
    q: sp.get("q") ?? undefined,
    status: sp.get("status") ?? undefined,
    city: sp.get("city") ?? undefined,
    courier: sp.get("courier") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    page: 1,
    per: 1000,
  });

  const csv = toCsv(
    result.rows.map((o) => ({
      reference: o.reference,
      status: o.status,
      customer: o.customer.fullName,
      phone: o.customer.phone,
      city: o.deliveryCity,
      address: o.deliveryAddress,
      items_total: (o.itemsTotal / 100).toFixed(2),
      shipping: (o.shippingFee / 100).toFixed(2),
      total: (o.total / 100).toFixed(2),
      cod: (o.codAmount / 100).toFixed(2),
      courier: o.courier?.user.name ?? "",
      source: o.source,
      created: o.createdAt.toISOString().slice(0, 10),
    }))
  );

  return new NextResponse(`\ufeff${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="masar-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
