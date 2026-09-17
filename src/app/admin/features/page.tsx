import { getFeatureMap, FEATURES } from "@/server/features";
import { getI18n } from "@/i18n/server";
import { PageHeader } from "@/components/shared";
import { FeatureToggles, type FeatureRow } from "@/components/admin/feature-toggles";

export const metadata = { title: "Features" };

export default async function AdminFeaturesPage() {
  const i = await getI18n();
  const map = await getFeatureMap();
  const rows: FeatureRow[] = FEATURES.map((f) => ({
    key: f.key,
    icon: f.icon as string,
    category: f.category,
    enabled: map[f.key] ?? true,
  }));
  return (
    <>
      <PageHeader title={i.t("features.title")} subtitle={i.t("features.subtitle")} />
      <FeatureToggles features={rows} />
    </>
  );
}
