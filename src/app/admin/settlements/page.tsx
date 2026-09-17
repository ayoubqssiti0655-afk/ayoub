import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { PageHeader } from "@/components/shared";
import { SettlementsClient, type SettlementRowView } from "@/components/admin/settlements-client";
import { BulkSettlementExport, type MerchantPayoutRow } from "@/components/admin/bulk-settlement-export";
import { getFeatureMap } from "@/server/features";

export const metadata = { title: "Settlements" };

export default async function AdminSettlementsPage({ searchParams }: { searchParams: Promise<{ merchant?: string }> }) {
  const i = await getI18n();
  const { merchant: merchantId } = await searchParams;
  const features = await getFeatureMap();

  const [settlements, eligibleMerchants] = await Promise.all([
    db.settlement.findMany({
      where: merchantId ? { merchantId } : undefined,
      include: { merchant: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    features.admin_bank_settlement_export
      ? db.merchant.findMany({
          where: { walletBalance: { gte: 20000 } },
          select: { id: true, name: true, phone: true, city: true, walletBalance: true },
          orderBy: { walletBalance: "desc" },
        })
      : [],
  ]);

  let payoutRows: MerchantPayoutRow[] = [];
  if (features.admin_bank_settlement_export && eligibleMerchants.length > 0) {
    const bankKeys = eligibleMerchants.map((m) => `merchant_bank_${m.id}`);
    const bankSettings = await db.setting.findMany({
      where: { key: { in: bankKeys } },
    });
    const bankMap = new Map<string, { bankName: string; rib: string; accountHolder: string }>();
    for (const s of bankSettings) {
      try {
        const mId = s.key.replace("merchant_bank_", "");
        bankMap.set(mId, JSON.parse(s.value));
      } catch {}
    }

    payoutRows = eligibleMerchants.map((m) => {
      const bank = bankMap.get(m.id);
      return {
        merchantId: m.id,
        merchantName: m.name,
        phone: m.phone,
        city: m.city ?? "",
        amountCentimes: m.walletBalance,
        amountDh: m.walletBalance / 100,
        hasRib: !!bank?.rib,
        bankName: bank?.bankName ?? "Non renseigné",
        rib: bank?.rib ?? "",
        accountHolder: bank?.accountHolder ?? m.name,
      };
    });
  }

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

      {features.admin_bank_settlement_export && (
        <div className="mb-6">
          <BulkSettlementExport initialRows={payoutRows} enabled={features.admin_bank_settlement_export} />
        </div>
      )}

      <SettlementsClient rows={rows} />
    </>
  );
}
