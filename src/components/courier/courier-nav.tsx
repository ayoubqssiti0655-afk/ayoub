"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, History, Banknote, User, Globe } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export function CourierNav({ activeCount, unread }: { activeCount: number; unread: number }) {
  const { t } = useI18n();
  const pathname = usePathname();

  const items = [
    { href: "/courier", label: t("nav.home"), icon: Home },
    { href: "/courier/deliveries", label: t("nav.deliveries"), icon: Package, badge: activeCount },
    { href: "/courier/history", label: t("nav.history"), icon: History },
    { href: "/courier/earnings", label: t("nav.earnings"), icon: Banknote },
    { href: "/courier/profile", label: t("nav.profile"), icon: User, badge: unread },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Courier"
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/courier" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex h-16 flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span className="relative">
                <item.icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                {item.badge ? (
                  <span className="absolute -end-1.5 -top-1 flex min-w-4 items-center justify-center rounded-full bg-error px-1 text-[9px] font-bold text-white tnum">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </span>
              {item.label}
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function LocaleSwitch() {
  const { locale } = useI18n();
  const cycle = (l: string) => {
    document.cookie = `masar_lang=${l}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  };
  return (
    <button
      onClick={() => cycle(locale === "fr" ? "ar" : locale === "ar" ? "en" : "fr")}
      className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground"
      aria-label="Language"
    >
      <Globe className="size-3" />
      {locale.toUpperCase()}
    </button>
  );
}
