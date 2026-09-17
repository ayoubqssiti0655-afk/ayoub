import { getMerchantContext } from "@/lib/auth";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { PageHeader } from "@/components/shared";
import { CustomersTable } from "@/components/merchant/customers-table";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = await getMerchantContext();
  if (!ctx) return null;
  const i = await getI18n();
  const { q } = await searchParams;

  const customers = await db.customer.findMany({
    where: {
      merchantId: ctx.merchant.id,
      ...(q ? { OR: [{ fullName: { contains: q } }, { phone: { contains: q } }] } : {}),
    },
    orderBy: [{ totalOrders: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <>
      <PageHeader title={i.t("customers.title")} subtitle={i.t("customers.subtitle", { count: i.num(customers.length) })} />
      <CustomersTable
        rows={customers.map((c) => ({
          id: c.id, fullName: c.fullName, phone: c.phone, city: c.city,
          totalOrders: c.totalOrders, totalSpent: c.totalSpent, failedCount: c.failedCount, returnedCount: c.returnedCount,
        }))}
        q={q ?? ""}
      />
    </>
  );
}
