import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { PageHeader } from "@/components/shared";
import { MerchantsClient, type MerchantRow } from "@/components/admin/merchants-client";

export const metadata = { title: "Merchants" };

export default async function AdminMerchantsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const i = await getI18n();
  const sp = await searchParams;
  const q = sp.q ?? "";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const per = 20;

  const where = q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { city: { contains: q } }] } : {};
  const [total, merchants, cities] = await Promise.all([
    db.merchant.count({ where }),
    db.merchant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * per,
      take: per,
      include: { _count: { select: { orders: true } } },
    }),
    db.city.findMany({ orderBy: { nameFr: "asc" } }),
  ]);

  const rows: MerchantRow[] = merchants.map((m) => ({
    id: m.id, name: m.name, email: m.email, city: m.city, plan: m.plan,
    status: m.status, orders: m._count.orders, wallet: m.walletBalance, createdAt: m.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader title={i.t("admin.merchants.title")} subtitle={i.t("common.showing", { from: (page - 1) * per + 1, to: Math.min(total, page * per), total })} />
      <MerchantsClient rows={rows} total={total} page={page} totalPages={Math.max(1, Math.ceil(total / per))} cities={cities.map((c) => c.nameFr)} />
    </>
  );
}
