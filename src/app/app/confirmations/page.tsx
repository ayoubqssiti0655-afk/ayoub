import Link from "next/link";
import { getMerchantContext } from "@/lib/auth";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { getFeatureMap } from "@/server/features";
import { computeTrustScore } from "@/server/trust";
import { PageHeader, EmptyState } from "@/components/shared";
import { ConfirmQueue } from "@/components/merchant/confirm-queue";
import { PhoneCall } from "lucide-react";

export const metadata = { title: "Confirmation queue" };

export default async function ConfirmationsPage() {
  const ctx = await getMerchantContext();
  if (!ctx) return null;
  const i = await getI18n();
  const features = await getFeatureMap();

  const orders = await db.order.findMany({
    where: { merchantId: ctx.merchant.id, status: "NEW" },
    include: { customer: true },
    orderBy: { createdAt: "asc" },
    take: 60,
  });

  const rows = orders.map((o) => {
    const trust = computeTrustScore(o.customer);
    return {
      id: o.id,
      reference: o.reference,
      fullName: o.customer.fullName,
      phone: o.customer.phone,
      city: o.deliveryCity,
      total: o.total,
      createdAt: o.createdAt.toISOString(),
      trust,
    };
  });
  // riskiest first
  rows.sort((a, b) => a.trust.score - b.trust.score);

  return (
    <>
      <PageHeader title={i.t("confirm.title")} subtitle={i.t("confirm.desc")} />
      {rows.length === 0 ? (
        <EmptyState icon={PhoneCall} title={i.t("confirm.empty")} />
      ) : (
        <ConfirmQueue rows={rows} enabled={features.confirmation_queue} />
      )}
    </>
  );
}
