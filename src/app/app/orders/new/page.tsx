import { getMerchantContext } from "@/lib/auth";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { PageHeader } from "@/components/shared";
import { NewOrderForm } from "@/components/merchant/new-order-form";
import { getFeatureMap } from "@/server/features";

export const metadata = { title: "New order" };

export default async function NewOrderPage() {
  const ctx = await getMerchantContext();
  if (!ctx) return null;
  const i = await getI18n();

  const [products, cities] = await Promise.all([
    db.product.findMany({
      where: { merchantId: ctx.merchant.id, isActive: true },
      select: { id: true, name: true, price: true, sku: true, stock: true },
      orderBy: { name: "asc" },
    }),
    db.city.findMany({
      include: { zones: { where: { isActive: true }, orderBy: { deliveryFee: "asc" }, take: 1 } },
      orderBy: { nameFr: "asc" },
    }),
  ]);

  const cityFees = cities.map((c) => ({
    name: c.nameFr,
    fee: c.zones[0]?.deliveryFee ?? 3500,
  }));
  const features = await getFeatureMap();

  return (
    <>
      <PageHeader title={i.t("order.new.title")} subtitle={i.t("order.new.desc")} />
      <NewOrderForm products={products} cities={cityFees} trustEnabled={features.trust_score} exchangeEnabled={features.exchange_orders} addressIQEnabled={features.address_iq} />
    </>
  );
}
