"use client";

import * as React from "react";
import { useI18n } from "@/i18n/provider";

export function BottomSheetSimple({
  title, children, open, onClose,
}: {
  title: string; children: React.ReactNode; open: boolean; onClose: () => void;
}) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-2xl border-t border-border bg-surface p-4 shadow-lg animate-slide-up"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-[12.5px] text-muted-foreground hover:bg-muted">{t("common.close")}</button>
        </div>
        {children}
      </div>
    </div>
  );
}
