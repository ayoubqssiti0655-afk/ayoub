import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { getPricingConfig } from "@/server/pricing";
import { PageHeader } from "@/components/shared";
import { ZonesClient, type ZoneRowView } from "@/components/admin/zones-client";

export const metadata = { title: "Zones" };

export default async function AdminZonesPage() {
  const i = await getI18n();

  const [cities, config] = await Promise.all([
    db.city.findMany({
      include: {
        region: { select: { nameFr: true } },
        zones: { where: { isActive: true }, orderBy: { deliveryFee: "asc" }, take: 1 },
      },
      orderBy: { nameFr: "asc" },
    }),
    getPricingConfig(),
  ]);

  const zones: ZoneRowView[] = cities.flatMap((c) =>
    c.zones.map((z) => ({
      id: z.id,
      cityFr: c.nameFr, cityAr: c.nameAr, cityEn: c.nameEn,
      region: c.region.nameFr,
      zoneName: z.name,
      deliveryFee: z.deliveryFee, returnFee: z.returnFee, etaHours: z.etaHours,
      isRemote: c.isRemote, isActive: z.isActive,
    }))
  );

  return (
    <>
      <PageHeader title={i.t("admin.zones.title")} subtitle={i.t("admin.zones.subtitle")} />
      <ZonesClient
        zones={zones}
        regions={(await db.region.findMany({ orderBy: { nameFr: "asc" } })).map((r) => ({ id: r.id, nameFr: r.nameFr }))}
        remoteMultiplier={config.remoteMultiplier}
      />
    </>
  );
}
