import { getMerchantContext } from "@/lib/auth";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { isFeatureEnabled, getFeatureMap } from "@/server/features";
import { PageHeader } from "@/components/shared";
import { WalletClient, type TxRow, type SettlementRow, type BankDetails, type WalletStats } from "@/components/merchant/wallet-client";

export const metadata = { title: "Wallet" };

export default async function WalletPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const ctx = await getMerchantContext();
  if (!ctx) return null;
  const i = await getI18n();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const per = 10;

  const [
    merchant,
    txCount,
    txs,
    settlements,
    inTransitAgg,
    paidSettlementsAgg,
    feesAgg,
    pendingInCaisseAgg,
    bankSetting,
    cycleChosenSetting,
    instantPayoutEnabled,
    payoutFrequencyEnabled,
  ] = await Promise.all([
    db.merchant.findUnique({ where: { id: ctx.merchant.id } }),
    db.codTransaction.count({ where: { merchantId: ctx.merchant.id } }),
    db.codTransaction.findMany({
      where: { merchantId: ctx.merchant.id },
      include: { order: { select: { id: true, reference: true } } },
      orderBy: { occurredAt: "desc" },
      take: 100,
    }),
    db.settlement.findMany({
      where: { merchantId: ctx.merchant.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.order.aggregate({
      where: {
        merchantId: ctx.merchant.id,
        status: { in: ["READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"] },
      },
      _sum: { codAmount: true },
    }),
    db.settlement.aggregate({
      where: { merchantId: ctx.merchant.id, status: "PAID" },
      _sum: { netAmount: true },
    }),
    db.codTransaction.aggregate({
      where: { merchantId: ctx.merchant.id, type: { in: ["DELIVERY_FEE", "RETURN_FEE"] } },
      _sum: { amount: true },
    }),
    db.codTransaction.aggregate({
      where: { merchantId: ctx.merchant.id, type: "COD_COLLECTION", status: "PENDING" },
      _sum: { amount: true },
    }),
    db.setting.findUnique({ where: { key: `merchant_bank_${ctx.merchant.id}` } }),
    db.setting.findUnique({ where: { key: `merchant_cycle_chosen_${ctx.merchant.id}` } }),
    isFeatureEnabled("instant_payout"),
    isFeatureEnabled("payout_frequency"),
  ]);
  if (!merchant) return null;
  const features = await getFeatureMap();

  const transactions: TxRow[] = txs.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    status: tx.status,
    description: tx.description,
    occurredAt: tx.occurredAt.toISOString(),
    orderId: tx.order?.id ?? null,
    reference: tx.order?.reference ?? null,
  }));

  const settlementRows: SettlementRow[] = settlements.map((s) => ({
    id: s.id,
    reference: s.reference,
    grossCOD: s.grossCOD,
    fees: s.fees,
    netAmount: s.netAmount,
    status: s.status,
    method: s.method,
    paymentReference: s.paymentReference,
    paymentNote: s.paymentNote,
    periodStart: s.periodStart?.toISOString() ?? null,
    periodEnd: s.periodEnd?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    paidAt: s.paidAt?.toISOString() ?? null,
  }));

  let bankDetails: BankDetails | null = null;
  if (bankSetting) {
    try {
      bankDetails = JSON.parse(bankSetting.value);
    } catch {
      bankDetails = null;
    }
  }

  const pendingInCaisse = pendingInCaisseAgg._sum.amount ?? 0;
  const inTransitCod = inTransitAgg._sum.codAmount ?? 0;
  const stats: WalletStats = {
    available: merchant.walletBalance,
    pendingCod: inTransitCod + pendingInCaisse,
    totalPaidOut: paidSettlementsAgg._sum.netAmount ?? 0,
    totalFees: Math.abs(feesAgg._sum.amount ?? 0),
  };

  return (
    <>
      <PageHeader title={i.t("wallet.title")} subtitle={i.t("wallet.subtitle")} />
      <WalletClient
        balance={merchant.walletBalance}
        stats={stats}
        bankDetails={bankDetails}
        instantPayoutEnabled={instantPayoutEnabled}
        payoutFrequencyEnabled={payoutFrequencyEnabled}
        merchantName={merchant.name}
        settlementCycle={merchant.settlementCycle}
        cycleChosen={cycleChosenSetting?.value === "true"}
        transactions={transactions}
        settlements={settlementRows}
        taxInvoicesEnabled={features.tax_invoices}
        page={page}
        totalPages={Math.max(1, Math.ceil(settlementRows.length / per))}
        total={settlementRows.length}
      />
    </>
  );
}
