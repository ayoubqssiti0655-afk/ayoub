import { redirect, notFound } from "next/navigation";
import { getMerchantContext } from "@/lib/auth";
import { db } from "@/server/db";
import { isFeatureEnabled } from "@/server/features";
import { PrintableManifest, type ManifestItem } from "@/components/merchant/printable-manifest";

export const metadata = { title: "Bordereau de Retour" };

export default async function ReturnManifestPage() {
  const ctx = await getMerchantContext();
  if (!ctx) redirect("/login");

  const enabled = await isFeatureEnabled("return_manifest");
  if (!enabled) redirect("/app/returns");

  const returns = await db.return.findMany({
    where: { merchantId: ctx.merchant.id },
    include: {
      order: {
        include: {
          customer: true,
          courier: { include: { user: { select: { name: true } } } },
        },
      },
      courier: { include: { user: { select: { name: true } } } },
    },
    orderBy: { requestedAt: "desc" },
    take: 50,
  });

  if (returns.length === 0) redirect("/app/returns");

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const hash = Math.floor(1000 + Math.random() * 9000);
  const manifestRef = `RET-${today}-${hash}`;

  const items: ManifestItem[] = returns.map((r) => ({
    id: r.id,
    reference: r.order.reference,
    customerName: r.order.customer.fullName,
    customerPhone: r.order.customer.phone,
    city: r.order.deliveryCity,
    codAmount: r.order.codAmount,
    status: r.status,
    returnReason: r.reason,
  }));

  const courierName = returns.find((r) => r.courier?.user?.name)?.courier?.user?.name ?? null;

  return (
    <PrintableManifest
      type="RETOUR"
      reference={manifestRef}
      merchant={{
        name: ctx.merchant.name,
        phone: ctx.merchant.phone,
        city: ctx.merchant.city,
        address: ctx.merchant.address,
      }}
      items={items}
      courierName={courierName}
      backHref="/app/returns"
    />
  );
}

