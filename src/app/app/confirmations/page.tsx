import { redirect } from "next/navigation";
import { getMerchantContext } from "@/lib/auth";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { getFeatureMap } from "@/server/features";
import { computeTrustScore } from "@/server/trust";
import { PageHeader } from "@/components/shared";
import { ConfirmQueue } from "@/components/merchant/confirm-queue";

export const metadata = { title: "Confirmation queue" };

export default async function ConfirmationsPage() {
  const ctx = await getMerchantContext();
  if (!ctx) redirect("/login");

  const i = await getI18n();
  const features = await getFeatureMap();

  const orders = await db.order.findMany({
    where: { merchantId: ctx.merchant.id, status: "NEW" },
    include: { customer: true },
    orderBy: { createdAt: "asc" },
    take: 60,
  });

  const rows = orders.map((o) => {
    const cust = o.customer ?? {
      fullName: "Client inconnu",
      phone: "",
      totalOrders: 0,
      failedCount: 0,
      returnedCount: 0,
      totalSpent: 0,
    };
    const trust = computeTrustScore(cust);
    return {
      id: o.id,
      reference: o.reference,
      fullName: cust.fullName || "Client inconnu",
      phone: cust.phone || "",
      city: o.deliveryCity || "",
      total: Number(o.total) || 0,
      createdAt: o.createdAt.toISOString(),
      trust,
    };
  });

  // Riskiest first
  rows.sort((a, b) => a.trust.score - b.trust.score);

  return (
    <>
      <PageHeader title={i.t("confirm.title")} subtitle={i.t("confirm.desc")} />
      <ConfirmQueue rows={rows} enabled={features?.confirmation_queue ?? true} />
    </>
  );
}
