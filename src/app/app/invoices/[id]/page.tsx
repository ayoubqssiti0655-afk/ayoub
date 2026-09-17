import { notFound, redirect } from "next/navigation";
import { getMerchantContext } from "@/lib/auth";
import { db } from "@/server/db";
import { isFeatureEnabled } from "@/server/features";
import { PrintableTaxInvoice } from "@/components/merchant/printable-tax-invoice";

export const metadata = {
  title: "Facture Fiscale de Prestation",
};

export default async function TaxInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getMerchantContext();
  if (!ctx) return redirect("/login");

  const isEnabled = await isFeatureEnabled("tax_invoices");
  if (!isEnabled) {
    return redirect("/app/wallet");
  }

  const { id } = await params;

  const settlement = await db.settlement.findFirst({
    where: {
      id,
      merchantId: ctx.merchant.id,
    },
    include: {
      merchant: true,
    },
  });

  if (!settlement) {
    return notFound();
  }

  return (
    <PrintableTaxInvoice
      settlement={{
        id: settlement.id,
        reference: settlement.reference,
        grossCOD: settlement.grossCOD,
        fees: settlement.fees,
        netAmount: settlement.netAmount,
        status: settlement.status,
        method: settlement.method,
        paymentReference: settlement.paymentReference,
        periodStart: settlement.periodStart?.toISOString() ?? null,
        periodEnd: settlement.periodEnd?.toISOString() ?? null,
        createdAt: settlement.createdAt.toISOString(),
        paidAt: settlement.paidAt?.toISOString() ?? null,
      }}
      merchant={{
        name: ctx.merchant.name,
        legalName: ctx.merchant.legalName,
        phone: ctx.merchant.phone,
        email: ctx.merchant.email,
        city: ctx.merchant.city,
        address: ctx.merchant.address,
        slug: ctx.merchant.slug,
      }}
      backHref="/app/invoices"
    />
  );
}

