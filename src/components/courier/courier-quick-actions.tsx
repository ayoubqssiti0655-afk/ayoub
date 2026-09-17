"use client";

import * as React from "react";
import { MapPin, MessageCircle, Navigation, Phone, ExternalLink, Clock, PhoneMissed, MapPinned } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/misc";
import { waLink } from "@/lib/format";
import { cn } from "@/lib/utils";

export type QuickNavProps = {
  address: string;
  city: string;
  lat?: number | null;
  lng?: number | null;
  className?: string;
  size?: "sm" | "default";
};

export function CourierNavAction({ address, city, lat, lng, className, size = "sm" }: QuickNavProps) {
  const { t } = useI18n();

  const gmapsUrl = (lat != null && lng != null)
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${city}, Maroc`)}`;

  const wazeUrl = (lat != null && lng != null)
    ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(`${address}, ${city}`)}&navigate=yes`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft/40 hover:text-primary font-medium",
            size === "sm" ? "h-8 px-2.5 text-[12px]" : "h-10 px-3 text-[13px]",
            className
          )}
          title="التنقل عبر GPS"
        >
          <Navigation className="size-3.5 text-primary" />
          <span>{t("common.navigate")}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" side="top" className="w-52 p-1.5" onClick={(e) => e.stopPropagation()}>
        <p className="px-2.5 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t("courier.nav.choose")}
        </p>
        <a
          href={gmapsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-md px-2.5 py-2 text-[12.5px] font-medium transition-colors hover:bg-muted"
        >
          <span className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <MapPin className="size-3.5" />
            </span>
            Google Maps
          </span>
          <ExternalLink className="size-3 text-faint" />
        </a>
        <a
          href={wazeUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-md px-2.5 py-2 text-[12.5px] font-medium transition-colors hover:bg-muted"
        >
          <span className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Navigation className="size-3.5" />
            </span>
            Waze
          </span>
          <ExternalLink className="size-3 text-faint" />
        </a>
      </PopoverContent>
    </Popover>
  );
}

export type QuickWhatsAppProps = {
  customerName: string;
  customerPhone: string;
  reference: string;
  codAmount: number;
  className?: string;
  size?: "sm" | "default";
};

export function CourierWhatsAppActions({
  customerName,
  customerPhone,
  reference,
  codAmount,
  className,
  size = "sm",
}: QuickWhatsAppProps) {
  const { t, money } = useI18n();
  const firstName = customerName.split(" ")[0] || "الزبون";
  const amountStr = codAmount > 0 ? money(codAmount) : "الدفع مسبقاً";

  const msgLocation = t("courier.wa.tplAskLocation", { name: firstName, ref: reference });
  const msgNoAnswer = t("courier.wa.tplNoAnswer", { name: firstName, ref: reference, cod: amountStr });
  const msgPostpone = t("courier.wa.tplPostpone", { name: firstName, ref: reference });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/20 font-semibold",
            size === "sm" ? "h-8 px-2.5 text-[12px]" : "h-10 px-3 text-[13px]",
            className
          )}
          title="رسائل واتساب السريعة"
        >
          <MessageCircle className="size-3.5" />
          <span>واتساب</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" side="top" className="w-64 p-1.5" onClick={(e) => e.stopPropagation()}>
        <p className="px-2.5 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          قوالب واتساب سريعة بالدارجة
        </p>
        <div className="space-y-0.5">
          <a
            href={waLink(customerPhone, msgLocation)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12px] font-medium transition-colors hover:bg-emerald-500/10 text-foreground"
          >
            <MapPinned className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">{t("courier.wa.askLocation")}</p>
              <p className="text-[10.5px] text-muted-foreground">صيفط ليا اللوكاسيون...</p>
            </div>
          </a>

          <a
            href={waLink(customerPhone, msgNoAnswer)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12px] font-medium transition-colors hover:bg-warning-soft text-foreground"
          >
            <PhoneMissed className="size-4 text-warning shrink-0" />
            <div>
              <p className="font-semibold text-warning">{t("courier.wa.noAnswer")}</p>
              <p className="text-[10.5px] text-muted-foreground">عيطت ليك وماجاوبتينيش...</p>
            </div>
          </a>

          <a
            href={waLink(customerPhone, msgPostpone)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12px] font-medium transition-colors hover:bg-muted text-foreground"
          >
            <Clock className="size-4 text-primary shrink-0" />
            <div>
              <p className="font-semibold text-primary">{t("courier.wa.postpone")}</p>
              <p className="text-[10.5px] text-muted-foreground">تأجيل التوصيل إلى الغد...</p>
            </div>
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}

