"use client";

import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-5 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-surface-2">
        <svg className="size-6 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="mt-4 text-[17px] font-semibold">{t("common.errorTitle")}</h2>
      <p className="mt-1.5 max-w-sm text-[13.5px] text-muted-foreground">{t("common.errorDesc")}</p>
      <Button className="mt-5" onClick={reset}>{t("common.retry")}</Button>
    </div>
  );
}
