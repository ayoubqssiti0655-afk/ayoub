import { db } from "@/server/db";

const DAY = 86400000;

/** End-of-day cash reconciliation for a courier: collected COD vs declared deposits. */
export async function cashSummary(courierId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [collectedAgg, deposits, openBalanceAgg] = await Promise.all([
    db.delivery.aggregate({
      where: { courierId, codCollected: { gt: 0 }, deliveredAt: { gte: startOfToday } },
      _sum: { codCollected: true },
    }),
    db.courierDeposit.findMany({
      where: { courierId, declaredAt: { gte: startOfToday } },
      orderBy: { declaredAt: "desc" },
    }),
    db.delivery.aggregate({
      where: { courierId, codCollected: { gt: 0 }, codStatus: { in: ["COLLECTED", "SETTLED"] } },
      _sum: { codCollected: true },
    }),
  ]);

  const declaredDeposits = deposits.filter((d) => d.status === "DECLARED" || d.status === "VERIFIED");
  const expensesList = deposits.filter((d) => d.status === "EXPENSE");
  const totalExpensesToday = expensesList.reduce((a, d) => a + d.amount, 0);
  const declared = declaredDeposits.reduce((a, d) => a + d.amount, 0);
  const collectedToday = collectedAgg._sum.codCollected ?? 0;
  const allTimeCollected = openBalanceAgg._sum.codCollected ?? 0;
  const allTimeDeclaredAgg = await db.courierDeposit.aggregate({
    where: { courierId, status: { in: ["DECLARED", "VERIFIED"] } },
    _sum: { amount: true },
  });
  const allTimeExpensesAgg = await db.courierDeposit.aggregate({
    where: { courierId, status: "EXPENSE" },
    _sum: { amount: true },
  });

  const netCashInHand = Math.max(
    0,
    allTimeCollected - (allTimeDeclaredAgg._sum.amount ?? 0) - (allTimeExpensesAgg._sum.amount ?? 0)
  );

  return {
    collectedToday,
    declaredToday: declared,
    expensesToday: totalExpensesToday,
    remainingToday: Math.max(0, collectedToday - totalExpensesToday - declared),
    depositsToday: deposits,
    cashInHand: netCashInHand,
  };
}

export async function declareExpense(courierId: string, input: { amount: number; type: string; proofPhoto?: string; note?: string }) {
  return db.courierDeposit.create({
    data: {
      courierId,
      amount: input.amount,
      expectedAmount: 0,
      difference: -input.amount,
      proofPhoto: input.proofPhoto,
      note: `[EXPENSE:${input.type}] ${input.note ?? ""}`.trim(),
      status: "EXPENSE",
    },
  });
}

/**
 * Release pending COD transactions for delivered parcels of a courier
 * when deposited in LA CAISSE (or verified by admin).
 * Updates merchant wallet balances accordingly.
 */
export async function releaseCourierPendingCod(courierId: string) {
  const deliveries = await db.delivery.findMany({
    where: { courierId, status: "DELIVERED" },
    select: { id: true, orderId: true },
  });
  const orderIds = deliveries.map((d) => d.orderId).filter(Boolean);
  if (orderIds.length === 0) return { releasedCount: 0 };

  const pendingTxs = await db.codTransaction.findMany({
    where: { orderId: { in: orderIds }, status: "PENDING" },
    select: { id: true, merchantId: true },
  });

  if (pendingTxs.length > 0) {
    await db.codTransaction.updateMany({
      where: { id: { in: pendingTxs.map((t) => t.id) } },
      data: { status: "AVAILABLE" },
    });

    const affectedMerchants = Array.from(new Set(pendingTxs.map((t) => t.merchantId)));
    const { recalcWallet } = await import("@/server/orders");
    for (const mId of affectedMerchants) {
      await recalcWallet(mId);
    }
  }

  await db.delivery.updateMany({
    where: {
      id: { in: deliveries.map((d) => d.id) },
      codStatus: "COLLECTED",
    },
    data: { codStatus: "SETTLED" },
  });

  return { releasedCount: pendingTxs.length };
}

export async function declareDeposit(courierId: string, input: { amount: number; proofPhoto?: string; note?: string }) {
  const summary = await cashSummary(courierId);
  const expected = summary.remainingToday;
  const deposit = await db.courierDeposit.create({
    data: {
      courierId,
      amount: input.amount,
      expectedAmount: Math.max(0, expected),
      difference: input.amount - Math.max(0, expected),
      proofPhoto: input.proofPhoto,
      note: input.note,
      status: "DECLARED",
    },
  });

  // Note: Courier declared the deposit in LA CAISSE (status: DECLARED).
  // COD is held in PENDING state until the Admin verifies the deposit (setDepositStatus -> VERIFIED or bulkApproveDepositsAction).
  // Only upon Admin approval is releaseCourierPendingCod executed and added to merchant available wallet balance.

  return deposit;
}

export async function setDepositStatus(depositId: string, status: "VERIFIED" | "MISMATCH", verifiedBy: string) {
  const deposit = await db.courierDeposit.update({ where: { id: depositId }, data: { status, verifiedAt: new Date(), verifiedBy } });
  if (status === "VERIFIED") {
    await releaseCourierPendingCod(deposit.courierId);
  }
  return deposit;
}

