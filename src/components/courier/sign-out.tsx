"use client";

import { LogOut } from "lucide-react";
import { useI18n } from "@/i18n/provider";

export function SignOutButton() {
  const { t } = useI18n();
  return (
    <button
      onClick={async () => {
        await fetch("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
        window.location.href = "/login";
      }}
      className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-error/30 bg-error-soft text-[13.5px] font-semibold text-error"
    >
      <LogOut className="size-4" /> {t("common.signOut")}
    </button>
  );
}
