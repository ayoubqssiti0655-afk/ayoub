import { redirect, notFound } from "next/navigation";
import { getMerchantContext } from "@/lib/auth";
import { db } from "@/server/db";
import { isFeatureEnabled } from "@/server/features";
import { PrintableManifest, type ManifestItem } from "@/components/merchant/printable-manifest";

export const metadata = { title: "Bordereau de Ramassage" };

export default async function PickupManifestPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids: idsParam } = await searchParams;
  const ctx = await getMerchantContext();
  if (!ctx) redirect("/login");

  const enabled = await isFeatureEnabled("pickup_manifest");
  if (!enabled) redirect("/app/orders");

  const ids = (idsParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) redirect("/app/orders");

  const orders = await db.order.findMany({
    where: {
      id: { in: ids },
      merchantId: ctx.merchant.id,
    },
    include: { customer: true, courier: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "asc" },
  });

  if (orders.length === 0) notFound();

  // Generate reference RAM-YYYYMMDD-XXXX
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const hash = Math.floor(1000 + Math.random() * 9000);
  const manifestRef = `RAM-${today}-${hash}`;

  const items: ManifestItem[] = orders.map((o) => ({
    id: o.id,
    reference: o.reference,
    customerName: o.customer.fullName,
    customerPhone: o.customer.phone,
    city: o.deliveryCity,
    codAmount: o.codAmount,
    status: o.status,
  }));

  const courierName = orders.find((o) => o.courier?.user?.name)?.courier?.user?.name ?? null;

  return (
    <PrintableManifest
      type="RAMASSAGE"
      reference={manifestRef}
      merchant={{
        name: ctx.merchant.name,
        phone: ctx.merchant.phone,
        city: ctx.merchant.city,
        address: ctx.merchant.address,
      }}
      items={items}
      courierName={courierName}
      backHref="/app/orders"
    />
  );
}

