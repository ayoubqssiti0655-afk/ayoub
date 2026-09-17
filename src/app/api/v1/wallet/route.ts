import { db } from "@/server/db";
import { api, ok, forbidden } from "@/lib/api";

export const GET = api(
  async (_req, { merchantId, session }) => {
    if (!merchantId && session?.role !== "ADMIN") throw forbidden();
    const merchant = merchantId
      ? await db.merchant.findUnique({ where: { id: merchantId } })
      : null;
    const id = merchantId ?? session!.merchantId ?? undefined;
    const [balance, transactions] = await Promise.all([
      id ? db.merchant.findUnique({ where: { id }, select: { walletBalance: true } }) : null,
      db.codTransaction.findMany({
        where: merchantId ? { merchantId } : {},
        orderBy: { occurredAt: "desc" },
        take: 50,
      }),
    ]);
    return ok({
      balance: balance?.walletBalance ?? merchant?.walletBalance ?? 0,
      transactions: transactions.map((t) => ({
        id: t.id, type: t.type, amount: t.amount, status: t.status, description: t.description, occurredAt: t.occurredAt,
      })),
    });
  },
  { auth: ["MERCHANT", "MERCHANT_STAFF", "ADMIN"], apiKey: true }
);
