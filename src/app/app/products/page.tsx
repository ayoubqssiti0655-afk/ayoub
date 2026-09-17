import { getMerchantContext } from "@/lib/auth";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { PageHeader } from "@/components/shared";
import { ProductsClient, type ProductRow } from "@/components/merchant/products-client";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const ctx = await getMerchantContext();
  if (!ctx) return null;
  const i = await getI18n();

  const [products, soldRows] = await Promise.all([
    db.product.findMany({ where: { merchantId: ctx.merchant.id, isActive: true }, orderBy: { createdAt: "desc" } }),
    db.orderItem.groupBy({
      by: ["productId"],
      where: { order: { merchantId: ctx.merchant.id }, productId: { not: null } },
      _sum: { quantity: true },
    }),
  ]);
  const soldMap = new Map(soldRows.map((r) => [r.productId!, r._sum.quantity ?? 0]));

  const rows: ProductRow[] = products.map((p) => ({
    id: p.id, name: p.name, sku: p.sku, category: p.category,
    price: p.price, stock: p.stock, sold: soldMap.get(p.id) ?? 0, isActive: p.isActive,
  }));

  return (
    <>
      <PageHeader title={i.t("products.title")} subtitle={i.t("products.subtitle", { count: i.num(rows.length) })} />
      <ProductsClient products={rows} />
    </>
  );
}
