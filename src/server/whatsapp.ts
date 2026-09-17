import { db } from "@/server/db";
import { isFeatureEnabled } from "@/server/features";

/**
 * WhatsApp provider abstraction. The default driver logs to console + persists a
 * Notification row (channel=WHATSAPP) so the product UI can show the full log.
 * Swap `sendViaProvider` with the WhatsApp Cloud API (graph.facebook.com) or
 * 360dialog without touching call sites.
 */

export type WhatsAppTemplate =
  | "ORDER_CONFIRMED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "PAID_ONLINE"
  | "RETURNED";

type TemplateInput = {
  customerName: string;
  reference: string;
  merchantName: string;
  trackingUrl: string;
  otp?: string;
  amount?: string;
  nextDate?: string;
  supportPhone: string;
};

const TEMPLATES: Record<Locale, Record<WhatsAppTemplate, (i: TemplateInput) => string>> = {
  fr: {
    ORDER_CONFIRMED: (i) => `Bonjour ${i.customerName}, votre commande ${i.reference} chez ${i.merchantName} est confirmée ✓. Suivez votre colis : ${i.trackingUrl}`,
    OUT_FOR_DELIVERY: (i) => `Bonne nouvelle ${i.customerName} ! Votre colis ${i.reference} arrive aujourd'hui 🛵${i.otp ? `\nVotre code de réception : ${i.otp}` : ""}${i.amount ? `\nPréparez ${i.amount} en espèces.` : ""}\nSuivi : ${i.trackingUrl}`,
    DELIVERED: (i) => `Votre colis ${i.reference} a été livré ✓. Merci d'avoir acheté chez ${i.merchantName} !`,
    FAILED: (i) => `Nous n'avons pas pu vous joindre pour le colis ${i.reference}. Nouvelle tentative : ${i.nextDate ?? "demain"}. Besoin d'aide ? ${i.supportPhone}`,
    PAID_ONLINE: (i) => `Paiement reçu ✓ — ${i.amount} pour la commande ${i.reference}. Le livreur ne vous demandera plus d'espèces. Suivi : ${i.trackingUrl}`,
    RETURNED: (i) => `Votre retour pour la commande ${i.reference} a été enregistré. Une question ? ${i.supportPhone}`,
  },
  ar: {
    ORDER_CONFIRMED: (i) => `أهلًا ${i.customerName}، تم تأكيد طلبك ${i.reference} من ${i.merchantName} ✓. تابع طردك: ${i.trackingUrl}`,
    OUT_FOR_DELIVERY: (i) => `خبر سار ${i.customerName}! طردك ${i.reference} في الطريق إليك اليوم 🛵${i.otp ? `\nرمز الاستلام: ${i.otp}` : ""}${i.amount ? `\nجهّز ${i.amount} نقدًا.` : ""}\nالتتبع: ${i.trackingUrl}`,
    DELIVERED: (i) => `تم توصيل طردك ${i.reference} ✓. شكرًا لتسوقك من ${i.merchantName}!`,
    FAILED: (i) => `لم نتمكن من الوصول إليك بخصوص الطرد ${i.reference}. محاولة جديدة: ${i.nextDate ?? "غدًا"}. للمساعدة: ${i.supportPhone}`,
    PAID_ONLINE: (i) => `تم استلام الدفع ✓ — ${i.amount} للطلب ${i.reference}. لن يطلب منك الموزّع نقدًا. التتبع: ${i.trackingUrl}`,
    RETURNED: (i) => `تم تسجيل إرجاع الطلب ${i.reference}. لأي استفسار: ${i.supportPhone}`,
  },
  en: {
    ORDER_CONFIRMED: (i) => `Hi ${i.customerName}, your order ${i.reference} from ${i.merchantName} is confirmed ✓. Track it: ${i.trackingUrl}`,
    OUT_FOR_DELIVERY: (i) => `Good news ${i.customerName}! Your parcel ${i.reference} arrives today 🛵${i.otp ? `\nYour delivery code: ${i.otp}` : ""}${i.amount ? `\nPrepare ${i.amount} in cash.` : ""}\nTrack: ${i.trackingUrl}`,
    DELIVERED: (i) => `Your parcel ${i.reference} was delivered ✓. Thanks for shopping with ${i.merchantName}!`,
    FAILED: (i) => `We couldn't reach you about parcel ${i.reference}. Next attempt: ${i.nextDate ?? "tomorrow"}. Need help? ${i.supportPhone}`,
    PAID_ONLINE: (i) => `Payment received ✓ — ${i.amount} for order ${i.reference}. The courier won't ask for cash. Track: ${i.trackingUrl}`,
    RETURNED: (i) => `Your return for order ${i.reference} has been recorded. Questions? ${i.supportPhone}`,
  },
};

type Locale = "fr" | "ar" | "en";

async function sendViaProvider(to: string, body: string): Promise<boolean> {
  // Replace with WhatsApp Cloud API:
  // POST https://graph.facebook.com/v20.0/{phone-number-id}/messages { messaging_product: "whatsapp", to, text: { body } }
  console.log(`[whatsapp] → ${to}: ${body.replace(/\n/g, " | ")}`);
  return true;
}

export async function sendCustomerWhatsApp(opts: {
  template: WhatsAppTemplate;
  locale?: Locale;
  phone: string; // customer phone (+212…)
  merchantId: string;
  orderId: string;
  input: TemplateInput;
}) {
  if (!(await isFeatureEnabled("whatsapp"))) return;
  const locale = opts.locale ?? "fr";
  const body = TEMPLATES[locale][opts.template](opts.input);
  try {
    await db.notification.create({
      data: {
        merchantId: opts.merchantId,
        type: opts.template,
        title: `WhatsApp → ${opts.phone}`,
        body,
        channel: "WHATSAPP",
        data: JSON.stringify({ phone: opts.phone, orderId: opts.orderId, template: opts.template }),
      },
    });
    await sendViaProvider(opts.phone, body);
  } catch (e) {
    console.error("[whatsapp] failed:", e);
  }
}

export function trackingUrl(appUrl: string, reference: string) {
  return `${appUrl}/track?ref=${reference}`;
}
