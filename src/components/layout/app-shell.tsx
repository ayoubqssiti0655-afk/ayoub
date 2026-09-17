"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Bell, Bike, Check, Globe, Laptop, LogOut, Menu, Moon, Search, Sun, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";
import { LOCALE_LABELS, type Locale } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/misc";
import { Avatar } from "@/components/ui/misc";
import { Logo } from "@/components/logo";
import { CommandPalette } from "@/components/layout/command-palette";
import * as Icons from "lucide-react";

export type NavIcon = string;
export type NavItem = { href: string; label: string; icon: NavIcon; badge?: number };
export type NavSection = { label?: string; items: NavItem[] };

const ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  LayoutDashboard: Icons.LayoutDashboard, Plus: Icons.Plus, ShoppingCart: Icons.ShoppingCart, Truck: Icons.Truck,
  RotateCcw: Icons.RotateCcw, Package: Icons.Package, Users: Icons.Users, Wallet: Icons.Wallet,
  ChartLine: Icons.ChartLine, Plug: Icons.Plug, Settings: Icons.Settings, Building2: Icons.Building2,
  Bike: Icons.Bike, Banknote: Icons.Banknote, MapPinned: Icons.MapPinned, Tags: Icons.Tags,
  ScrollText: Icons.ScrollText, ChartBar: Icons.BarChart3, Bell: Icons.Bell, CreditCard: Icons.CreditCard,
  Map: Icons.Map, Tag: Icons.Tag, PackageOpen: Icons.PackageOpen, Store: Icons.Store, PhoneCall: Icons.PhoneCall, LifeBuoy: Icons.LifeBuoy, UserCog: Icons.UserCog, FileText: Icons.FileText, Siren: Icons.Siren, Weight: Icons.Weight, TicketPercent: Icons.TicketPercent, CalendarClock: Icons.CalendarClock, Zap: Icons.Zap, Boxes: Icons.Boxes, Star: Icons.Star, Brain: Icons.Brain, Newspaper: Icons.Newspaper, Scale: Icons.Scale, ScanLine: Icons.ScanLine, BellRing: Icons.BellRing, MessageCircle: Icons.MessageCircle, ShieldCheck: Icons.ShieldCheck, Wand2: Icons.Wand2, RefreshCcw: Icons.RefreshCcw, Scroll: Icons.ScrollText, Gauge: Icons.Gauge,
};
function NavGlyph({ name }: { name: string }) {
  const C = ICONS[name] ?? Icons.Circle;
  return <C className="size-4 shrink-0" strokeWidth={1.9} />;
}

export function AppShell({
  nav,
  user,
  children,
  unread = 0,
  searchEnabled = true,
}: {
  nav: NavSection[];
  user: { name: string; email: string; subtitle?: string };
  children: React.ReactNode;
  unread?: number;
  searchEnabled?: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<{ id: string; title: string; body?: string; readAt: string | null; createdAt: string }[]>([]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function openNotifications() {
    setNotifOpen(true);
    try {
      const res = await fetch("/api/v1/notifications");
      if (res.ok) setNotifications((await res.json()).data);
    } catch {}
  }

  async function markAllRead() {
    await fetch("/api/v1/notifications", { method: "POST" }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    router.refresh();
  }

  async function setLocaleCookie(l: Locale) {
    document.cookie = `masar_lang=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  async function signOut() {
    await fetch("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Logo />
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Main">
        {nav.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint">{t(section.label)}</p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/app" && item.href !== "/admin" && item.href !== "/courier" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      data-active={active}
                      className="group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[active=true]:bg-primary-soft data-[active=true]:text-primary"
                    >
                      <NavGlyph name={item.icon} />
                      <span className="truncate">{t(item.label)}</span>
                      {item.badge ? (
                        <span className="ms-auto rounded-full bg-primary px-1.5 py-0.5 text-[10.5px] font-semibold text-primary-foreground tnum">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      ) : null}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-1 py-1">
          <Avatar name={user.name} size={30} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium leading-4">{user.name}</p>
            <p className="truncate text-[11px] text-faint">{user.subtitle ?? user.email}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-60 border-e border-border bg-surface lg:block">{sidebar}</aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 border-e border-border bg-surface shadow-lg animate-slide-up">{sidebar}</aside>
        </div>
      )}

      <div className="lg:ms-60">
        {/* topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-surface/85 px-4 backdrop-blur-md">
          <Button variant="ghost" size="iconSm" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <Menu className="size-4.5" />
          </Button>

          {searchEnabled && (
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex h-8.5 w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-input px-3 text-[12.5px] text-faint shadow-xs transition-colors hover:border-border-strong"
            >
              <Search className="size-3.5" />
              <span className="truncate">{t("common.searchPlaceholder")}</span>
              <kbd className="ms-auto hidden items-center rounded border border-border bg-muted px-1.5 font-sans text-[10px] text-muted-foreground sm:flex">
                ⌘K
              </kbd>
            </button>
          )}

          <div className="ms-auto flex items-center gap-0.5">
            {/* notifications */}
            <Popover open={notifOpen} onOpenChange={(o) => { if (o) openNotifications(); else setNotifOpen(false); }}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="iconSm" aria-label={t("common.notifications")} className="relative">
                  <Bell className="size-4.5" strokeWidth={1.9} />
                  {unread > 0 && <span className="absolute end-1 top-1 size-2 rounded-full bg-error ring-2 ring-surface" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-84 p-0" align="end">
                <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
                  <p className="text-[13px] font-semibold">{t("common.notifications")}</p>
                  <button onClick={markAllRead} className="flex items-center gap-1 text-[11.5px] font-medium text-primary hover:underline">
                    <Check className="size-3" /> {t("common.markAllRead")}
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-[12.5px] text-muted-foreground">{t("common.noNotifications")}</p>
                  ) : (
                    notifications.slice(0, 12).map((n) => (
                      <div key={n.id} className={cn("border-b border-border/60 px-3.5 py-2.5", !n.readAt && "bg-primary-soft/40")}>
                        <p className="text-[12.5px] font-medium leading-5">{n.title}</p>
                        {n.body && <p className="text-[12px] leading-5 text-muted-foreground">{n.body}</p>}
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* language */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="iconSm" aria-label={t("common.language")}>
                  <Globe className="size-4.5" strokeWidth={1.9} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(["fr", "ar", "en"] as Locale[]).map((l) => (
                  <DropdownMenuItem key={l} onClick={() => setLocaleCookie(l)} className={cn(locale === l && "bg-primary-soft text-primary")}>
                    <span className="w-5 text-center text-[13px]">{LOCALE_LABELS[l].short}</span>
                    {LOCALE_LABELS[l].native}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Courier Mode Switcher */}
            <Link
              href="/courier"
              className="hidden sm:inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-[12px] font-medium text-foreground shadow-xs hover:bg-muted transition-colors me-1"
              title={t("nav.courierApp") || "Espace Livreur"}
            >
              <Bike className="size-3.5 text-primary" />
              <span>{t("nav.courierApp") || "Espace Livreur"}</span>
            </Link>

            {/* theme */}
            <ThemeToggle />

            {/* profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ms-1 flex items-center rounded-full outline-none" aria-label={t("common.myAccount")}>
                  <Avatar name={user.name} size={30} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <p className="truncate text-[13px] font-semibold normal-case tracking-normal text-foreground">{user.name}</p>
                  <p className="truncate text-[11.5px] font-normal normal-case tracking-normal text-faint">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/app/settings")}>
                  <User /> {t("common.viewProfile")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/courier")}>
                  <Bike /> {t("nav.courierApp") || "Espace Livreur"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onClick={signOut}>
                  <LogOut /> {t("common.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 lg:px-7">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

function ThemeToggle() {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <Button variant="ghost" size="iconSm" aria-label={t("common.theme")}><Sun className="size-4.5" /></Button>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="iconSm" aria-label={t("common.theme")}>
          {theme === "dark" ? <Moon className="size-4.5" strokeWidth={1.9} /> : <Sun className="size-4.5" strokeWidth={1.9} />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}><Sun /> {t("common.light")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}><Moon /> {t("common.dark")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}><Laptop /> {t("common.system")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


