import { headers } from "next/headers";
import { getMerchantContext } from "@/lib/auth";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { PageHeader } from "@/components/shared";
import { IntegrationsClient, type ApiKeyRow, type WebhookRow, type IntegrationRow } from "@/components/merchant/integrations-client";

export const metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  const ctx = await getMerchantContext();
  if (!ctx) return null;
  const i = await getI18n();
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const baseUrl = `${h.get("x-forwarded-proto") ?? "http"}://${host}`;

  const [keys, webhooks, integrations] = await Promise.all([
    db.apiKey.findMany({ where: { merchantId: ctx.merchant.id }, orderBy: { createdAt: "desc" } }),
    db.webhook.findMany({ where: { merchantId: ctx.merchant.id }, orderBy: { createdAt: "desc" } }),
    db.integration.findMany({ where: { merchantId: ctx.merchant.id } }),
  ]);

  const keyRows: ApiKeyRow[] = keys.map((k) => ({
    id: k.id, name: k.name, prefix: k.prefix,
    createdAt: k.createdAt.toISOString(), lastUsedAt: k.lastUsedAt?.toISOString() ?? null, revokedAt: k.revokedAt?.toISOString() ?? null,
  }));
  const webhookRows: WebhookRow[] = webhooks.map((w) => ({
    id: w.id, url: w.url, events: JSON.parse(w.events) as string[], isActive: w.isActive,
    lastStatus: w.lastStatus, lastFiredAt: w.lastFiredAt?.toISOString() ?? null, secret: w.secret,
  }));
  const integrationRows: IntegrationRow[] = integrations.map((x) => ({ platform: x.platform, status: x.status }));

  return (
    <>
      <PageHeader title={i.t("integrations.title")} subtitle={i.t("integrations.subtitle")} />
      <IntegrationsClient keys={keyRows} webhooks={webhookRows} integrations={integrationRows} baseUrl={baseUrl} />
    </>
  );
}
