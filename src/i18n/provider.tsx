"use client";

import * as React from "react";
import { defaultLocale, dirOf, type Locale } from "./config";
import { en } from "./dictionaries/en";
import { fr } from "./dictionaries/fr";
import { ar } from "./dictionaries/ar";
import { formatMoney, formatDate, formatDateTime, formatRelative, formatNumber, formatPercent, formatPhone } from "@/lib/format";

export type Dict = Record<string, string>;
const DICTS: Record<Locale, Dict> = { en, fr, ar };

export type I18n = {
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

const I18nContext = React.createContext<I18n | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = React.useMemo<I18n>(() => {
    const dict = DICTS[locale] ?? {};
    const t = (key: string, vars?: Record<string, string | number>) => {
      let s = dict[key] ?? en[key] ?? fr[key] ?? key;
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
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

/** Localized city name helper usable from client components. */
export function localizedCity(city: { nameFr: string; nameAr: string; nameEn: string }, locale: Locale) {
  return locale === "ar" ? city.nameAr : locale === "en" ? city.nameEn : city.nameFr;
}

export { defaultLocale };
