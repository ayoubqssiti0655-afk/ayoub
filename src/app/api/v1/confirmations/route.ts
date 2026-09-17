import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getCurrentUser, getMerchantContext } from "@/lib/auth";
import { computeTrustScore } from "@/server/trust";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getMerchantContext();
    let merchantId = ctx?.merchant?.id ?? null;

    if (!merchantId) {
      const user = await getCurrentUser();
      if (user?.role === "ADMIN") {
        const sp = req.nextUrl.searchParams;
        merchantId = sp.get("merchantId");
        if (!merchantId) {
          const firstM = await db.merchant.findFirst({ select: { id: true } });
          merchantId = firstM?.id ?? null;
        }
      }
    }

    if (!merchantId) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const orders = await db.order.findMany({
      where: {
        merchantId,
        status: "NEW",
      },
      include: { customer: true },
      orderBy: { createdAt: "asc" },
      take: 60,
    });

    const rows = orders.map((o) => {
      const trust = computeTrustScore(o.customer);
      return {
        id: o.id,
        reference: o.reference,
        fullName: o.customer.fullName,
        phone: o.customer.phone,
        city: o.deliveryCity,
        total: o.total,
        createdAt: o.createdAt.toISOString(),
        trust,
      };
    });

    // Riskiest first
    rows.sort((a, b) => a.trust.score - b.trust.score);

    return NextResponse.json({
      success: true,
      count: rows.length,
      orders: rows,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[confirmations API error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
