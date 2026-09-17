import { db } from "@/server/db";
import { api, ok } from "@/lib/api";

// Role-aware global search: orders, tracking numbers, customers, products, merchants.
export const GET = api(
  async (req, { session }) => {
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    if (q.length < 2) return ok({ groups: [] });
    const like = q.toLowerCase();
    const role = session!.role;

    const groups: { label: string; items: { id: string; title: string; subtitle?: string; href: string; icon: string; badge?: string }[] }[] = [];

    // ── orders (merchant scope or admin) ──
    if (role === "MERCHANT" || role === "MERCHANT_STAFF" || role === "ADMIN") {
      const where = {
        OR: [
          { reference: { contains: q } },
          { customer: { fullName: { contains: q } } },
          { customer: { phone: { contains: q } } },
          { deliveryCity: { contains: q } },
        ],
        ...(role === "ADMIN" ? {} : { merchantId: session!.merchantId ?? "" }),
      };
      const orders = await db.order.findMany({
        where,
        include: { customer: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
        take: 6,
      });
      if (orders.length) {
        groups.push({
          label: "Orders",
          items: orders.map((o) => ({
            id: o.id,
            title: o.reference,
            subtitle: `${o.customer.fullName} · ${o.deliveryCity}`,
            href: role === "ADMIN" ? `/admin/orders?ref=${o.reference}` : `/app/orders/${o.id}`,
            icon: "order",
          })),
        });
      }
    }

    // ── customers ──
    if (role === "MERCHANT" || role === "MERCHANT_STAFF") {
      const customers = await db.customer.findMany({
        where: { merchantId: session!.merchantId ?? "", OR: [{ fullName: { contains: q } }, { phone: { contains: q } }] },
        take: 5,
        orderBy: { totalOrders: "desc" },
      });
      if (customers.length) {
        groups.push({
          label: "Customers",
          items: customers.map((c) => ({ id: c.id, title: c.fullName, subtitle: c.phone, href: `/app/customers/${c.id}`, icon: "customer" })),
        });
      }
      // products
      const products = await db.product.findMany({
        where: { merchantId: session!.merchantId ?? "", name: { contains: q } },
        take: 4,
      });
      if (products.length) {
        groups.push({
          label: "Products",
          items: products.map((p) => ({ id: p.id, title: p.name, subtitle: p.sku ?? undefined, href: "/app/products", icon: "product" })),
        });
      }
    }

    // ── merchants (admin) ──
    if (role === "ADMIN") {
      const merchants = await db.merchant.findMany({
        where: { OR: [{ name: { contains: q } }, { email: { contains: q } }] },
        take: 5,
      });
      if (merchants.length) {
        groups.push({
          label: "Merchants",
          items: merchants.map((m) => ({ id: m.id, title: m.name, subtitle: m.city ?? undefined, href: `/admin/merchants/${m.id}`, icon: "merchant" })),
        });
      }
      const couriers = await db.courier.findMany({
        where: { user: { name: { contains: q } } },
        include: { user: { select: { name: true } } },
        take: 4,
      });
      if (couriers.length) {
        groups.push({
          label: "Couriers",
          items: couriers.map((c) => ({ id: c.id, title: c.user.name, subtitle: c.employeeCode, href: `/admin/couriers/${c.id}`, icon: "merchant" })),
        });
      }
    }

    return ok({ groups });
  },
  { auth: ["ADMIN", "MERCHANT", "MERCHANT_STAFF"], rate: { limit: 120, windowMs: 60000 } }
);
