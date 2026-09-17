import { getI18n } from "@/i18n/server";
import { db } from "@/server/db";
import { getFeatureMap } from "@/server/features";
import { listBags } from "@/server/bags";
import { PageHeader, EmptyState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { PackageOpen } from "lucide-react";
import { HubClient } from "@/components/admin/hub-client";

export const metadata = { title: "Sorting hub" };

export default async function AdminHubPage() {
  const i = await getI18n();
  const features = await getFeatureMap();
  if (!features.hub_bags) {
    return (
      <>
        <PageHeader title={i.t("hub.title")} />
        <EmptyState icon={PackageOpen} title={i.t("features.off")} description={i.t("features.subtitle")} />
      </>
    );
  }

  const [bags, cities, couriers] = await Promise.all([
    listBags(),
    db.city.findMany({ orderBy: { nameFr: "asc" } }),
    db.courier.findMany({ where: { status: "ACTIVE" }, include: { user: { select: { name: true } } }, orderBy: { employeeCode: "asc" } }),
  ]);

  const bagRows = bags.map((b) => ({
    id: b.id,
    reference: b.reference,
    city: b.city,
    status: b.status,
    sealCode: b.sealCode,
    parcelCount: (JSON.parse(b.parcelRefs) as string[]).length,
    parcelRefs: JSON.parse(b.parcelRefs) as string[],
    courierName: b.courier?.user.name ?? null,
    createdAt: b.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader title={i.t("hub.title")} subtitle={i.t("features.f.hub_bags.desc")} />
      <HubClient
        bags={bagRows}
        cities={cities.map((c) => c.nameFr)}
        couriers={couriers.map((c) => ({ id: c.id, name: c.user.name }))}
      />
    </>
  );
}
