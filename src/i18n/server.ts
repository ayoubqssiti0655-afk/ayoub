import { cookies } from "next/headers";
import { defaultLocale, isLocale, dirOf, type Locale } from "./config";
import { en } from "./dictionaries/en";
import { fr } from "./dictionaries/fr";
import { ar } from "./dictionaries/ar";
import { formatMoney, formatDate, formatDateTime, formatRelative, formatNumber, formatPercent, formatPhone } from "@/lib/format";
import { cache } from "react";

export type ServerI18n = {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: (key: string, vars?: Record<string, string | number>) => string;
  money: (c: number, opts?: { compact?: boolean; signed?: boolean }) => string;
  date: (d: Date | string, opts?: Intl.DateTimeFormatOptions) => string;
  dateTime: (d: Date | string) => string;
  rel: (d: Date | string) => string;
  num: (n: number) => string;
  pct: (n: number, digits?: number) => string;
  phone: (p?: string | null) => string;
};

const DICTS = { en, fr, ar };

export const getI18n = cache(async (): Promise<ServerI18n> => {
  const store = await cookies();
  const raw = store.get("masar_lang")?.value;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = DICTS[locale] ?? {};
  const t = (key: string, vars?: Record<string, string | number>) => {
    let s = dict[key] ?? en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    return s;
  };
  return {
    locale,
    dir: dirOf(locale),
    t,
    money: (c, opts) => formatMoney(c, locale, opts),
    date: (d, opts) => formatDate(d, locale, opts),
    dateTime: (d) => formatDateTime(d, locale),
    rel: (d) => formatRelative(d, locale),
    num: (n) => formatNumber(n, locale),
    pct: (n, digits) => formatPercent(n, locale, digits),
    phone: (p) => formatPhone(p),
  };
});

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get("masar_lang")?.value;
  return isLocale(raw) ? raw : defaultLocale;
}
