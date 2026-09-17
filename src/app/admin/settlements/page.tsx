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

  const [settlements, pendingSettlements, eligibleMerchants] = await Promise.all([
    db.settlement.findMany({
      where: merchantId ? { merchantId } : undefined,
      include: { merchant: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    features.admin_bank_settlement_export
      ? db.settlement.findMany({
          where: {
            status: "PROCESSING",
            ...(merchantId ? { merchantId } : {}),
          },
          include: {
            merchant: { select: { id: true, name: true, phone: true, city: true } },
          },
          orderBy: { createdAt: "asc" },
        })
      : [],
    features.admin_bank_settlement_export
      ? db.merchant.findMany({
          where: {
            walletBalance: { gte: 20000 },
            ...(merchantId ? { id: merchantId } : {}),
          },
          select: { id: true, name: true, phone: true, city: true, walletBalance: true },
          orderBy: { walletBalance: "desc" },
        })
      : [],
  ]);

  let payoutRows: MerchantPayoutRow[] = [];
  if (features.admin_bank_settlement_export && (pendingSettlements.length > 0 || eligibleMerchants.length > 0)) {
    const allMerchantIds = Array.from(
      new Set([
        ...pendingSettlements.map((s) => s.merchant.id),
        ...eligibleMerchants.map((m) => m.id),
      ])
    );
    const bankKeys = allMerchantIds.map((mId) => `merchant_bank_${mId}`);
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

    // 1. Pending settlement requests (طلبات السحب المعلقة قيد التنفيذ)
    for (const s of pendingSettlements) {
      const bank = bankMap.get(s.merchant.id);
      const cleanRib = bank?.rib ? bank.rib.replace(/\D/g, "") : "";
      payoutRows.push({
        id: `settlement_${s.id}`,
        settlementId: s.id,
        reference: s.reference,
        merchantId: s.merchant.id,
        merchantName: s.merchant.name,
        phone: s.merchant.phone,
        city: s.merchant.city ?? "",
        amountCentimes: s.netAmount,
        amountDh: s.netAmount / 100,
        hasRib: cleanRib.length === 24,
        bankName: bank?.bankName ?? "Non renseigné",
        rib: bank?.rib ?? "",
        accountHolder: bank?.accountHolder ?? s.merchant.name,
        source: "SETTLEMENT_REQUEST",
        method: s.method,
        createdAt: s.createdAt.toISOString(),
      });
    }

    // 2. Merchants with accumulated wallet balance >= 200 DH who haven't requested yet
    const pendingMerchantIds = new Set(pendingSettlements.map((s) => s.merchant.id));
    for (const m of eligibleMerchants) {
      // If merchant already has a pending settlement and 0 extra balance, skip to avoid confusion
      if (pendingMerchantIds.has(m.id) && m.walletBalance < 20000) continue;

      const bank = bankMap.get(m.id);
      const cleanRib = bank?.rib ? bank.rib.replace(/\D/g, "") : "";
      payoutRows.push({
        id: `wallet_${m.id}`,
        merchantId: m.id,
        merchantName: m.name,
        phone: m.phone,
        city: m.city ?? "",
        amountCentimes: m.walletBalance,
        amountDh: m.walletBalance / 100,
        hasRib: cleanRib.length === 24,
        bankName: bank?.bankName ?? "Non renseigné",
        rib: bank?.rib ?? "",
        accountHolder: bank?.accountHolder ?? m.name,
        source: "WALLET_BALANCE",
      });
    }
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
