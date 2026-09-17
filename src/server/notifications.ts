import { db } from "@/server/db";

// ── Notification providers (pluggable) ────────────────────────────
// In-app writes to DB. Email/SMS/WhatsApp use provider interfaces with a
// console/DB driver in this build — swap in Resend / Twilio / WhatsApp Cloud API
// by implementing the same interface.

export interface ChannelProvider {
  send(input: { to: string; title: string; body: string; data?: Record<string, unknown> }): Promise<boolean>;
}

const consoleProvider: ChannelProvider = {
  async send(input) {
    console.log(`[notify] ${input.title} → ${input.to}: ${input.body}`);
    return true;
  },
};

export const emailProvider: ChannelProvider = consoleProvider;
export const smsProvider: ChannelProvider = consoleProvider;
export const whatsappProvider: ChannelProvider = consoleProvider;

type NotifyInput = {
  userId?: string;
  merchantId?: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  /** extra delivery channels; in-app always persists */
  email?: { to: string };
  sms?: { to: string };
  whatsapp?: { to: string };
};

export async function notify(input: NotifyInput) {
  try {
    await db.notification.create({
      data: {
        userId: input.userId ?? null,
        merchantId: input.merchantId ?? null,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data ? JSON.stringify(input.data) : null,
        channel: "IN_APP",
      },
    });
    if (input.email) await emailProvider.send({ to: input.email.to, title: input.title, body: input.body ?? "", data: input.data });
    if (input.sms) await smsProvider.send({ to: input.sms.to, title: input.title, body: input.body ?? "", data: input.data });
    if (input.whatsapp) await whatsappProvider.send({ to: input.whatsapp.to, title: input.title, body: input.body ?? "", data: input.data });
  } catch (e) {
    console.error("[notify] failed:", e);
  }
}

/** Notify all users of a merchant (owner + staff). */
export async function notifyMerchant(merchantId: string, input: Omit<NotifyInput, "merchantId" | "userId">) {
  const staff = await db.merchantStaff.findMany({ where: { merchantId }, select: { userId: true } });
  await Promise.all(staff.map((s) => notify({ ...input, merchantId, userId: s.userId })));
}

// ── Webhooks (outgoing, HMAC signed) ──────────────────────────────
export async function fireWebhooks(merchantId: string, event: string, payload: Record<string, unknown>) {
  const hooks = await db.webhook.findMany({ where: { merchantId, isActive: true } });
  for (const hook of hooks) {
    const events = JSON.parse(hook.events) as string[];
    if (events.length && !events.includes(event)) continue;
    const body = JSON.stringify({ event, created_at: new Date().toISOString(), data: payload });
    let status: number | null = null;
    let ok = false;
    try {
      const res = await fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Masar-Event": event,
          "X-Masar-Signature": hook.secret,
        },
        body,
        signal: AbortSignal.timeout(8000),
      });
      status = res.status;
      ok = res.ok;
    } catch {
      status = null;
    }
    await db.webhook.update({ where: { id: hook.id }, data: { lastStatus: status, lastFiredAt: new Date() } }).catch(() => {});
    await db.webhookDelivery.create({
      data: { webhookId: hook.id, event, payload: body.slice(0, 4000), statusCode: status, ok },
    }).catch(() => {});
  }
}
