import type { Locale } from "@/i18n/config";

const TAGS: Record<Locale, string> = { fr: "fr-MA", ar: "ar-MA", en: "en-GB" };

/** Format centimes as MAD, e.g. 125000 → "1 250,00 DH" / "1,250.00 DH" / "1.250,00 د.م." */
export function formatMoney(centimes: number, locale: Locale = "fr", opts?: { compact?: boolean; signed?: boolean }) {
  const value = centimes / 100;
  const symbol = locale === "ar" ? "د.م." : locale === "en" ? "MAD" : "DH";
  const nf = new Intl.NumberFormat(TAGS[locale], {
    minimumFractionDigits: opts?.compact ? 0 : 2,
    maximumFractionDigits: opts?.compact ? 0 : 2,
  });
  const body = nf.format(Math.abs(value));
  const sign = centimes < 0 ? "−" : opts?.signed && centimes > 0 ? "+" : "";
  return locale === "ar" ? `${sign}${body} ${symbol}` : `${sign}${body} ${symbol}`;
}

export function formatNumber(n: number, locale: Locale = "fr") {
  return new Intl.NumberFormat(TAGS[locale]).format(n);
}

export function formatPercent(n: number, locale: Locale = "fr", digits = 1) {
  return new Intl.NumberFormat(TAGS[locale], { style: "percent", minimumFractionDigits: 0, maximumFractionDigits: digits }).format(n);
}

export function formatDate(d: Date | string, locale: Locale = "fr", opts?: Intl.DateTimeFormatOptions) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(TAGS[locale], opts ?? { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function formatDateTime(d: Date | string, locale: Locale = "fr") {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(TAGS[locale], { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function formatTime(d: Date | string, locale: Locale = "fr") {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(TAGS[locale], { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function formatRelative(d: Date | string, locale: Locale = "fr") {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(TAGS[locale], { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000000], ["month", 2592000000], ["week", 604800000], ["day", 86400000], ["hour", 3600000], ["minute", 60000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === "minute") return rtf.format(Math.round(diff / ms), unit);
  }
  return rtf.format(0, "minute");
}

/** +212612345678 → +212 6 12 34 56 78 */
export function formatPhone(raw?: string | null) {
  if (!raw) return "—";
  const digits = raw.replace(/[^\d+]/g, "");
  const m = digits.match(/^(\+212)([67])(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (m) return `${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]} ${m[6]}`;
  return raw;
}

export function waLink(raw: string, text?: string) {
  const digits = raw.replace(/\D/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function mapsLink(lat?: number | null, lng?: number | null, address?: string | null) {
  if (lat != null && lng != null) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return "#";
}

export function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const AVATAR_HUES = ["#2F45E0", "#0E7A5F", "#8A4B08", "#0F4C81", "#7A1F2B", "#1D5F8A", "#6941C6", "#B42318"];
export function avatarHue(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_HUES[h % AVATAR_HUES.length];
}

export function cityLabel(city: { nameFr: string; nameAr: string; nameEn: string }, locale: Locale) {
  return locale === "ar" ? city.nameAr : locale === "en" ? city.nameEn : city.nameFr;
}
