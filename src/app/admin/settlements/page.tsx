import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { PageHeader } from "@/components/shared";
import { SettlementsClient, type SettlementRowView } from "@/components/admin/settlements-client";

export const metadata = { title: "Settlements" };

export default async function AdminSettlementsPage({ searchParams }: { searchParams: Promise<{ merchant?: string }> }) {
  const i = await getI18n();
  const { merchant: merchantId } = await searchParams;
  const settlements = await db.settlement.findMany({
    where: merchantId ? { merchantId } : undefined,
    include: { merchant: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const rows: SettlementRowView[] = settlements.map((s) => ({
    id: s.id, reference: s.reference, merchantName: s.merchant.name,
    grossCOD: s.grossCOD, fees: s.fees, netAmount: s.netAmount, status: s.status, method: s.method,
    periodStart: s.periodStart?.toISOString() ?? null, periodEnd: s.periodEnd?.toISOString() ?? null,
    paidAt: s.paidAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    paymentReference: s.paymentReference,
    paymentNote: s.paymentNote,
  }));

  return (
    <>
      <PageHeader title={i.t("admin.settlements.title")} subtitle={i.t("admin.settlements.createDesc")} />
      <SettlementsClient rows={rows} />
    </>
  );
}
