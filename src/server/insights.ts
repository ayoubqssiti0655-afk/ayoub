import { db } from "@/server/db";
import { isFeatureEnabled } from "@/server/features";
import { DH } from "@/lib/utils";

const DAY = 86400000;

export type Insight = {
  tone: "good" | "warn" | "bad" | "info";
  icon: string; // lucide icon name for the client
  title: string;
  body: string;
  href?: string;
};

/**
 * Deterministic insight engine — rules over the merchant's own data that read
 * like an analyst's summary (no external LLM required). Localized in fr/ar/en.
 */
export async function generateInsights(merchantId: string, locale: "fr" | "ar" | "en"): Promise<Insight[]> {
  if (!(await isFeatureEnabled("insights"))) return [];
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * DAY);
  const prev30 = new Date(now.getTime() - 60 * DAY);

  const [statusCur, statusPrev, attempts, topCities, pendingCod, newCount, courierPerf] = await Promise.all([
    db.order.groupBy({ by: ["status"], where: { merchantId, createdAt: { gte: d30 } }, _count: true }),
    db.order.groupBy({ by: ["status"], where: { merchantId, createdAt: { gte: prev30, lt: d30 } }, _count: true }),
    db.deliveryAttempt.findMany({
      where: { delivery: { order: { merchantId } }, result: { not: "DELIVERED" }, occurredAt: { gte: d30 } },
      select: { reason: true },
      take: 500,
    }),
    db.order.groupBy({ by: ["deliveryCity"], where: { merchantId, createdAt: { gte: d30 }, status: { in: ["FAILED", "RETURNED"] } }, _count: true, orderBy: { _count: { deliveryCity: "desc" } }, take: 3 }),
    db.codTransaction.aggregate({ where: { merchantId, status: "AVAILABLE", type: "COD_COLLECTION" }, _sum: { amount: true } }),
    db.order.count({ where: { merchantId, status: "NEW" } }),
    db.courier.findMany({
      where: { deliveries: { some: { order: { merchantId }, status: "DELIVERED" } } },
      include: { user: { select: { name: true } }, deliveries: { where: { order: { merchantId } }, select: { status: true } } },
      take: 20,
    }),
  ]);

  const cnt = (groups: { status: string; _count: number }[], s: string) => groups.find((g) => g.status === s)?._count ?? 0;
  const cur = { delivered: cnt(statusCur, "DELIVERED"), failed: cnt(statusCur, "FAILED"), returned: cnt(statusCur, "RETURNED") };
  const prev = { delivered: cnt(statusPrev, "DELIVERED"), failed: cnt(statusPrev, "FAILED") };
  const insights: Insight[] = [];

  // 1. success rate trend
  const term = cur.delivered + cur.failed + cur.returned;
  const rate = term ? cur.delivered / term : 0;
  const pTerm = prev.delivered + prev.failed;
  const pRate = pTerm ? prev.delivered / pTerm : 0;
  if (term >= 5 && pTerm >= 5) {
    const delta = rate - pRate;
    if (delta <= -0.05) {
      insights.push({
        tone: "bad", icon: "TrendingUp", href: "/app/orders?status=FAILED",
        title: L(locale).rateDown.title.replace("{rate}", pct(rate)),
        body: L(locale).rateDown.body.replace("{delta}", pct(Math.abs(delta))),
      });
    } else if (delta >= 0.05) {
      insights.push({
        tone: "good", icon: "TrendingUp",
        title: L(locale).rateUp.title.replace("{rate}", pct(rate)),
        body: L(locale).rateUp.body.replace("{delta}", pct(delta)),
      });
    }
  }

  // 2. top failure reason
  const reasonCount: Record<string, number> = {};
  for (const a of attempts) if (a.reason) reasonCount[a.reason] = (reasonCount[a.reason] ?? 0) + 1;
  const topReason = Object.entries(reasonCount).sort((a, b) => b[1] - a[1])[0];
  if (topReason && topReason[1] >= 3) {
    insights.push({
      tone: "warn", icon: "PhoneMissed", href: "/app/orders?status=FAILED",
      title: L(locale).reason.title.replace("{count}", String(topReason[1])),
      body: L(locale).reason.body.replace("{reason}", reasonLabel(topReason[0], locale)).replace("{share}", pct(topReason[1] / attempts.length)),
    });
  }

  // 3. problem city
  if (topCities.length && topCities[0]._count >= 3) {
    insights.push({
      tone: "warn", icon: "MapPin", href: `/app/orders?status=FAILED&city=${encodeURIComponent(topCities[0].deliveryCity)}`,
      title: L(locale).city.title.replace("{city}", topCities[0].deliveryCity),
      body: L(locale).city.body.replace("{count}", String(topCities[0]._count)),
    });
  }

  // 4. COD ready to collect
  if ((pendingCod._sum.amount ?? 0) >= 20000) {
    insights.push({
      tone: "info", icon: "Banknote", href: "/app/wallet",
      title: L(locale).cod.title.replace("{amount}", money(pendingCod._sum.amount ?? 0, locale)),
      body: L(locale).cod.body,
    });
  }

  // 5. new orders waiting
  if (newCount > 0) {
    insights.push({
      tone: "info", icon: "ClipboardList", href: "/app/orders?status=NEW",
      title: L(locale).newOrders.title.replace("{count}", String(newCount)),
      body: L(locale).newOrders.body,
    });
  }

  // 6. best courier
  const scored = courierPerf
    .map((c) => {
      const delivered = c.deliveries.filter((d) => d.status === "DELIVERED").length;
      const failed = c.deliveries.filter((d) => d.status === "FAILED").length;
      return { name: c.user.name, delivered, failed, rate: delivered + failed ? delivered / (delivered + failed) : 0 };
    })
    .filter((c) => c.delivered >= 5)
    .sort((a, b) => b.rate - a.rate);
  if (scored[0]) {
    insights.push({
      tone: "good", icon: "Bike",
      title: L(locale).courier.title.replace("{name}", scored[0].name),
      body: L(locale).courier.body.replace("{count}", String(scored[0].delivered)).replace("{rate}", pct(scored[0].rate)),
    });
  }

  // 7. all clear
  if (!insights.length) {
    insights.push({ tone: "good", icon: "CheckCircle2", title: L(locale).allGood.title, body: L(locale).allGood.body });
  }
  return insights.slice(0, 5);
}

function pct(n: number) {
  return `${Math.round(n * 100)} %`;
}
function money(c: number, locale: string) {
  const tag = locale === "ar" ? "ar-MA" : locale === "en" ? "en-GB" : "fr-MA";
  return `${new Intl.NumberFormat(tag, { maximumFractionDigits: 0 }).format(c / DH)} DH`;
}
function reasonLabel(code: string, locale: string) {
  const map: Record<string, [string, string, string]> = {
    NO_ANSWER: ["Client injoignable", "الزبون لم يرد", "Customer unreachable"],
    UNREACHABLE: ["Téléphone éteint", "الهاتف مغلق", "Phone off"],
    WRONG_ADDRESS: ["Adresse incorrecte", "عنوان خاطئ", "Wrong address"],
    POSTPONED: ["Report par le client", "تأجيل من الزبون", "Customer postponed"],
    REFUSED: ["Colis refusé", "رفض الاستلام", "Parcel refused"],
    OUT_OF_ZONE: ["Hors zone", "خارج النطاق", "Out of zone"],
  };
  const idx = locale === "ar" ? 1 : locale === "en" ? 2 : 0;
  return map[code]?.[idx] ?? code;
}

const L = (locale: "fr" | "ar" | "en") => STRINGS[locale];

const STRINGS = {
  fr: {
    rateDown: { title: `Taux de livraison en baisse : {rate}`, body: `−{delta} par rapport aux 30 jours précédents. Vérifiez les échecs récents et relancez les retours bloqués.` },
    rateUp: { title: `Excellent : {rate} de réussite`, body: `+{delta} vs la période précédente. Gardez vos meilleurs créneaux.` },
    reason: { title: `{count} échecs pour la même raison`, body: `« {reason} » représente {share} des échecs. Un SMS/WhatsApp avant la tournée réduit ces cas.` },
    city: { title: `{city} concentre les problèmes`, body: `{count} échecs/retours sur 30 jours. Vérifiez les adresses de cette ville avant expédition.` },
    cod: { title: `{amount} de COD prêts`, body: `Cet argent est disponible dans votre portefeuille — demandez un versement.` },
    newOrders: { title: `{count} commandes à confirmer`, body: `Confirmez-les rapidement : chaque heure de retard décale la livraison d'une journée.` },
    courier: { title: `{name} est votre meilleur livreur`, body: `{count} colis livrés avec {rate} de réussite — pensez à lui confier les quartiers sensibles.` },
    allGood: { title: `Rien à signaler`, body: `Vos indicateurs sont stables. Continuez ainsi !` },
  },
  ar: {
    rateDown: { title: `تراجع في نسبة التوصيل: {rate}`, body: `انخفاض بـ{delta} مقارنة بالثلاثين يومًا السابقة. راجع حالات الفشل الأخيرة وأطلق المرتجعات المتوقفة.` },
    rateUp: { title: `ممتاز: نسبة نجاح {rate}`, body: `ارتفاع بـ{delta} عن الفترة السابقة. حافظ على نفس وتيرة العمل.` },
    reason: { title: `{count} حالات فشل لنفس السبب`, body: `«{reason}» يمثل {share} من حالات الفشل. رسالة واتساب قبل الجولة تقلل هذه الحالات.` },
    city: { title: `مدينة {city} تركز المشاكل`, body: `{count} حالات فشل/إرجاع في 30 يومًا. تحقق من عناوين هذه المدينة قبل الشحن.` },
    cod: { title: `{amount} نقدية جاهزة`, body: `هذه الأموال متاحة في محفظتك — اطلب تحويلًا الآن.` },
    newOrders: { title: `{count} طلبات بانتظار التأكيد`, body: `أكّدها بسرعة: كل ساعة تأخير تؤجل التوصيل يومًا كاملًا.` },
    courier: { title: `{name} أفضل موزّع لديك`, body: `وصل {count} طردًا بنسبة {rate} — فوّضه الأحياء الحساسة.` },
    allGood: { title: `لا ملاحظات`, body: `مؤشراتك مستقرة. واصل على هذا النحو!` },
  },
  en: {
    rateDown: { title: `Delivery rate dropping: {rate}`, body: `−{delta} vs the previous 30 days. Check recent failures and unblock pending returns.` },
    rateUp: { title: `Great: {rate} success rate`, body: `+{delta} vs the previous period. Keep your best delivery windows.` },
    reason: { title: `{count} failures share one reason`, body: `“{reason}” accounts for {share} of failures. A WhatsApp heads-up before the tour reduces these.` },
    city: { title: `{city} concentrates problems`, body: `{count} failures/returns in 30 days. Double-check addresses in this city before shipping.` },
    cod: { title: `{amount} of COD ready`, body: `This money is sitting in your wallet — request a settlement.` },
    newOrders: { title: `{count} orders awaiting confirmation`, body: `Confirm them quickly: every hour of delay pushes delivery by a day.` },
    courier: { title: `{name} is your top courier`, body: `{count} parcels delivered at {rate} success — trust them with sensitive areas.` },
    allGood: { title: `Nothing to report`, body: `Your indicators are stable. Keep it up!` },
  },
};
