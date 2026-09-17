"use client";

import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/i18n/provider";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/misc";
import type { Locale } from "@/i18n/config";

export function Providers({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  return (
    <I18nProvider locale={locale}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <ToastProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </ToastProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
