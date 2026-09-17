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
      where: { courierId, codCollected: { gt: 0 }, codStatus: "COLLECTED" },
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

export async function declareDeposit(courierId: string, input: { amount: number; proofPhoto?: string; note?: string }) {
  const summary = await cashSummary(courierId);
  const expected = summary.remainingToday;
  return db.courierDeposit.create({
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
}

export async function setDepositStatus(depositId: string, status: "VERIFIED" | "MISMATCH", verifiedBy: string) {
  return db.courierDeposit.update({ where: { id: depositId }, data: { status, verifiedAt: new Date(), verifiedBy } });
}

