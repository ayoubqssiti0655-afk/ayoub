import { getPricingConfig } from "@/server/pricing";
import { getI18n } from "@/i18n/server";
import { PageHeader } from "@/components/shared";
import { PricingClient } from "@/components/admin/pricing-client";

export const metadata = { title: "Pricing" };

export default async function AdminPricingPage() {
  const i = await getI18n();
  const config = await getPricingConfig();
  return (
    <>
      <PageHeader title={i.t("admin.pricing.title")} subtitle={i.t("admin.pricing.subtitle")} />
      <PricingClient config={config} />
    </>
  );
}
