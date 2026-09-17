"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, KeyRound, Plus, Plug, Trash2, Send, ExternalLink, Webhook as WebhookIcon } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  createApiKeyAction, revokeApiKeyAction, createWebhookAction, deleteWebhookAction, toggleWebhookAction, testWebhookAction,
} from "@/server/actions";
import { WEBHOOK_EVENTS } from "@/lib/constants";

export type ApiKeyRow = { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };
export type WebhookRow = { id: string; url: string; events: string[]; isActive: boolean; lastStatus: number | null; lastFiredAt: string | null; secret: string };
export type IntegrationRow = { platform: string; status: string };

export function IntegrationsClient({
  keys, webhooks, integrations, baseUrl,
}: {
  keys: ApiKeyRow[]; webhooks: WebhookRow[]; integrations: IntegrationRow[]; baseUrl: string;
}) {
  const { t, dateTime } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [createdKey, setCreatedKey] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [newKeyName, setNewKeyName] = React.useState("");
  const [keyDialog, setKeyDialog] = React.useState(false);
  const [webhookDialog, setWebhookDialog] = React.useState(false);
  const [whUrl, setWhUrl] = React.useState("");
  const [whEvents, setWhEvents] = React.useState<string[]>(["order.created", "order.delivered", "order.failed"]);
  const [busy, setBusy] = React.useState(false);

  const [youcanModal, setYoucanModal] = React.useState(false);

  const platforms = [
    { id: "YOUCAN", name: "YouCan.shop", desc: "منصة التجارة الإلكترونية المغربية الأولى — مزامنة تلقائية فورية للطلبات" },
    { id: "SHOPIFY", name: "Shopify", desc: "Sync orders automatically when paid" },
    { id: "WOOCOMMERCE", name: "WooCommerce", desc: "WordPress plugin, REST ready" },
    { id: "PRESTASHOP", name: "PrestaShop", desc: "Module 1.7 / 8.x" },
  ];
  const statusOf = (id: string) => integrations.find((x) => x.platform === id)?.status ?? "NONE";

  async function copy(v: string) {
    await navigator.clipboard.writeText(v).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-6">
      {/* API keys */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold"><KeyRound className="size-4 text-muted-foreground" /> {t("integrations.apiKeys")}</h2>
          <Button size="sm" onClick={() => { setNewKeyName(""); setKeyDialog(true); }}><Plus className="size-3.5" /> {t("integrations.newKey")}</Button>
        </div>
        <div className="rounded-xl border border-border bg-surface shadow-xs">
          {keys.filter((k) => !k.revokedAt).length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">{t("integrations.noKeys")}</p>
          ) : (
            <ul>
              {keys.filter((k) => !k.revokedAt).map((k) => (
                <li key={k.id} className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{k.name}</p>
                    <code className="text-[12px] text-muted-foreground" dir="ltr">{k.prefix}••••••••••••</code>
                  </div>
                  <span className="text-[11.5px] text-faint tnum">
                    {k.lastUsedAt ? t("integrations.keyLastUsed", { date: dateTime(k.lastUsedAt) }) : t("integrations.keyNeverUsed")}
                  </span>
                  <Button size="sm" variant="ghost" className="text-error" onClick={async () => { await revokeApiKeyAction(k.id); router.refresh(); }}>
                    {t("integrations.keyRevoke")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Webhooks */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold"><WebhookIcon className="size-4 text-muted-foreground" /> {t("integrations.webhooks")}</h2>
          <Button size="sm" variant="outline" onClick={() => { setWhUrl(""); setWebhookDialog(true); }}><Plus className="size-3.5" /> {t("integrations.newWebhook")}</Button>
        </div>
        {webhooks.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-[13px] text-muted-foreground shadow-xs">{t("integrations.noWebhooks")}</div>
        ) : (
          <ul className="space-y-2.5">
            {webhooks.map((w) => (
              <li key={w.id} className="rounded-xl border border-border bg-surface p-4 shadow-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <Switch checked={w.isActive} onCheckedChange={async (v) => { await toggleWebhookAction(w.id, v); router.refresh(); }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium" dir="ltr">{w.url}</p>
                    <p className="mt-0.5 flex flex-wrap gap-1">
                      {w.events.map((e) => <code key={e} className="rounded bg-muted px-1.5 py-0.5 text-[10.5px] text-muted-foreground">{e}</code>)}
                    </p>
                  </div>
                  {w.lastStatus != null && (
                    <Badge tone={w.lastStatus < 400 ? "success" : "error"} className="tnum">HTTP {w.lastStatus}</Badge>
                  )}
                  <Button size="sm" variant="outline" onClick={async () => {
                    const res = await testWebhookAction(w.id);
                    toast.push({ title: res.message ?? (res.ok ? "200 OK" : t("common.errorTitle")), variant: res.ok ? "success" : "error" });
                    router.refresh();
                  }}>
                    <Send className="size-3.5" /> {t("integrations.testFire")}
                  </Button>
                  <Button size="iconSm" variant="ghost" className="text-error" onClick={async () => { await deleteWebhookAction(w.id); router.refresh(); }} aria-label={t("common.delete")}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-faint">
                  {t("integrations.webhookSecret")} : <code className="rounded bg-muted px-1.5 py-0.5" dir="ltr">{w.secret.slice(0, 14)}…</code>
                  <button onClick={() => copy(w.secret)} className="rounded p-0.5 hover:bg-muted" aria-label={t("common.copy")}><Copy className="size-3" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Platforms */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold"><Plug className="size-4 text-muted-foreground" /> {t("integrations.platforms")}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {platforms.map((p) => {
            const st = statusOf(p.id);
            return (
              <div key={p.id} className="rounded-xl border border-border bg-surface p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-semibold">{p.name}</p>
                  <Badge tone={st === "CONNECTED" ? "success" : st === "PENDING" ? "warning" : "neutral"} dot>
                    {st === "CONNECTED" ? t("integrations.connected") : st === "PENDING" ? t("status.PENDING") : t("integrations.notConnected")}
                  </Badge>
                </div>
                <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">{p.desc}</p>
                {st !== "CONNECTED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full"
                    onClick={async () => {
                      if (p.id === "YOUCAN") {
                        setYoucanModal(true);
                        return;
                      }
                      await fetch("/api/v1/noop").catch(() => {});
                      const { connectIntegrationAction } = await import("@/server/actions");
                      await connectIntegrationAction(p.id);
                      router.refresh();
                    }}
                  >
                    <ExternalLink className="size-3.5" /> {p.id === "YOUCAN" ? "إعداد الربط" : t("integrations.connect")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* API docs */}
      <section>
        <h2 className="mb-3 text-[15px] font-semibold">{t("integrations.docs")}</h2>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <p className="text-[13px] leading-6 text-muted-foreground">
            {t("integrations.docsIntro", { url: `${baseUrl}/api/v1`, prefix: "msk_live_…" })}
            {" "}{t("integrations.authDesc")} {t("integrations.rateLimit")}
          </p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface-2 p-3 font-mono text-[11.5px] leading-6" dir="ltr">
            <p><span className="font-semibold text-success">POST</span> /api/v1/orders <span className="text-faint">— create order (items, customer{","} cod)</span></p>
            <p><span className="font-semibold text-info">GET</span> /api/v1/orders?status=NEW <span className="text-faint">— list orders</span></p>
            <p><span className="font-semibold text-info">GET</span> /api/v1/orders/:id <span className="text-faint">— order details</span></p>
            <p><span className="font-semibold text-info">GET</span> /api/v1/products <span className="text-faint">— catalog</span></p>
            <p><span className="font-semibold text-info">GET</span> /api/v1/customers <span className="text-faint">— customers</span></p>
            <p><span className="font-semibold text-info">GET</span> /api/v1/deliveries <span className="text-faint">— shipments</span></p>
            <p><span className="font-semibold text-info">GET</span> /api/v1/wallet <span className="text-faint">— balance + transactions</span></p>
            <p><span className="font-semibold text-info">GET</span> /api/v1/tracking/:reference <span className="text-faint">— public tracking</span></p>
          </div>
        </div>
      </section>

      {/* create key dialog */}
      <Dialog open={keyDialog} onOpenChange={setKeyDialog}>
        <DialogContent size="sm">
          <DialogTitle>{t("integrations.newKey")}</DialogTitle>
          <DialogDescription />
          {createdKey ? (
            <>
              <div className="mt-3 rounded-lg border border-warning/30 bg-warning-soft p-3">
                <p className="text-[12px] font-medium text-warning">{t("integrations.keyDialogDesc")}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <code className="flex-1 truncate rounded bg-surface px-2 py-1.5 text-[11.5px]" dir="ltr">{createdKey}</code>
                  <Button size="iconSm" variant="outline" onClick={() => copy(createdKey)} aria-label={t("common.copy")}>
                    {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => { setKeyDialog(false); setCreatedKey(null); router.refresh(); }}>{t("common.close")}</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="mt-3">
                <Field label={t("integrations.keyName")}>
                  <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Production, Staging…" autoFocus />
                </Field>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setKeyDialog(false)}>{t("common.cancel")}</Button>
                <Button
                  disabled={newKeyName.trim().length < 2 || busy}
                  onClick={async () => {
                    setBusy(true);
                    const res = await createApiKeyAction(newKeyName.trim());
                    setBusy(false);
                    if (res.ok && res.data?.key) { setCreatedKey(res.data.key); toast.push({ title: t("integrations.keyCreated"), variant: "success" }); }
                    else toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
                  }}
                >
                  {t("common.create")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* new webhook dialog */}
      <Dialog open={webhookDialog} onOpenChange={setWebhookDialog}>
        <DialogContent size="sm">
          <DialogTitle>{t("integrations.newWebhook")}</DialogTitle>
          <DialogDescription />
          <div className="mt-3 space-y-3.5">
            <Field label={t("integrations.webhookUrl")}>
              <Input value={whUrl} onChange={(e) => setWhUrl(e.target.value)} placeholder="https://votresite.ma/webhooks/masar" dir="ltr" />
            </Field>
            <Field label={t("integrations.webhookEvents")}>
              <div className="grid grid-cols-2 gap-1.5">
                {WEBHOOK_EVENTS.map((e) => {
                  const on = whEvents.includes(e);
                  return (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setWhEvents((prev) => (on ? prev.filter((x) => x !== e) : [...prev, e]))}
                      className={`rounded-md border px-2 py-1.5 text-start font-mono text-[11px] transition-colors ${on ? "border-primary/40 bg-primary-soft text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >
                      {e}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWebhookDialog(false)}>{t("common.cancel")}</Button>
            <Button
              disabled={!/^https?:\/\//.test(whUrl) || whEvents.length === 0 || busy}
              onClick={async () => {
                setBusy(true);
                const res = await createWebhookAction(whUrl, whEvents);
                setBusy(false);
                if (res.ok) { setWebhookDialog(false); router.refresh(); }
                else toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
              }}
            >
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* YouCan Modal */}
      <Dialog open={youcanModal} onOpenChange={setYoucanModal}>
        <DialogContent size="md">
          <DialogTitle className="flex items-center gap-2">
            <Plug className="size-5 text-primary" />
            ربط متجر YouCan.shop
          </DialogTitle>
          <DialogDescription>
            خطوات بسيطة لربط متجرك واستقبال طلبات الدفع عند الاستلام (COD) تلقائياً فور تسجيلها.
          </DialogDescription>
          <div className="mt-4 space-y-3.5 text-[13px]">
            <div className="rounded-xl border border-border bg-surface-2 p-3">
              <p className="font-semibold text-foreground">1. رابط الـ Webhook الخاص بمتجرك:</p>
              <div className="mt-1.5 flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2">
                <code className="text-[12px] font-mono select-all text-primary truncate" dir="ltr">
                  {baseUrl}/api/v1/integrations/youcan
                </code>
                <Button size="iconSm" variant="ghost" onClick={() => copy(`${baseUrl}/api/v1/integrations/youcan`)}>
                  {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                </Button>
              </div>
            </div>

            <ol className="space-y-2 text-muted-foreground list-decimal list-inside leading-6">
              <li>افتح لوحة تحكم متجرك في <strong>YouCan</strong>.</li>
              <li>انتقل إلى <strong>الإعدادات (Settings)</strong> ثم اختر <strong>Webhooks</strong>.</li>
              <li>اضغط على <strong>إضافة Webhook جديد</strong> والصق الرابط أعلاه.</li>
              <li>اختر الحدث (Event): <strong>order.create</strong>.</li>
              <li>احفظ التغييرات — سيتم إرسال أي طلب جديد مباشرة إلى مسار مع كافة التفاصيل!</li>
            </ol>
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={() => setYoucanModal(false)}>
              فهمت، تم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
