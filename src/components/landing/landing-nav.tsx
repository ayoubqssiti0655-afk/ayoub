"use client";

import * as React from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { LOCALE_LABELS, type Locale } from "@/i18n/config";
import { Logo } from "@/components/logo";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Globe, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function LandingNav() {
  const { t, locale } = useI18n();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const links = [
    { href: "#features", label: t("landing.nav.features") },
    { href: "#how", label: t("landing.nav.how") },
    { href: "#pricing", label: t("landing.nav.pricing") },
    { href: "#faq", label: t("landing.nav.faq") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link href="/" aria-label="Masar"><Logo /></Link>
        <nav className="hidden items-center gap-5 md:flex" aria-label="Main">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t("common.language")}>
                <Globe className="size-4" />
                <span className="hidden sm:inline">{LOCALE_LABELS[locale].short}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["fr", "ar", "en"] as Locale[]).map((l) => (
                <DropdownMenuItem
                  key={l}
                  className={cn(locale === l && "bg-primary-soft text-primary")}
                  onClick={() => { document.cookie = `masar_lang=${l}; path=/; max-age=31536000; samesite=lax`; window.location.reload(); }}
                >
                  <span className="w-5 text-center">{LOCALE_LABELS[l].short}</span> {LOCALE_LABELS[l].native}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t("common.theme")}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          )}
          <Link href="/login" className="hidden h-9 items-center rounded-lg px-3 text-[13.5px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground sm:flex">
            {t("landing.nav.signIn")}
          </Link>
          <Link href="/register" className="flex h-9 items-center rounded-lg bg-primary px-3.5 text-[13.5px] font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover">
            {t("landing.nav.start")}
          </Link>
          <button className="flex size-9 items-center justify-center rounded-lg text-muted-foreground md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M2 4.5h14M2 9h14M2 13.5h14" /></svg>
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-border bg-surface px-5 py-3 md:hidden" aria-label="Mobile">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-2 text-[14px] font-medium text-muted-foreground">
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
