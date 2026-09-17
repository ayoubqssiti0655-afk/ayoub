"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Globe } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LOCALE_LABELS, type Locale } from "@/i18n/config";

export function TrackForm({ initialRef }: { initialRef: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [value, setValue] = React.useState(initialRef);
  const [recent, setRecent] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem("masar_track_recent") ?? "[]"));
    } catch {}
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const ref = value.trim().toUpperCase();
    if (!ref) return;
    try {
      const next = [ref, ...recent.filter((r) => r !== ref)].slice(0, 4);
      localStorage.setItem("masar_track_recent", JSON.stringify(next));
    } catch {}
    router.push(`/track?ref=${encodeURIComponent(ref)}`);
  }

  return (
    <div>
      <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("tracking.placeholder")}
          aria-label={t("tracking.placeholder")}
          className="h-12 flex-1 rounded-xl text-center text-[15px] font-medium tracking-[0.08em] tnum"
          dir="ltr"
          autoFocus={!initialRef}
        />
        <Button type="submit" className="h-12 rounded-xl px-5 text-[14px]">
          <Search className="size-4" />
          <span className="hidden sm:inline">{t("tracking.cta")}</span>
        </Button>
      </form>

      {recent.length > 0 && (
        <div className="mt-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.06em] text-faint">{t("tracking.recent")}</p>
          <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
            {recent.map((r) => (
              <button
                key={r}
                onClick={() => { setValue(r); router.push(`/track?ref=${encodeURIComponent(r)}`); }}
                className="rounded-full border border-border bg-surface px-3 py-1 text-[11.5px] font-medium text-muted-foreground tnum transition-colors hover:border-primary/40 hover:text-primary"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function LocaleSwitch() {
  const { locale } = useI18n();
  return (
    <div className="flex gap-0.5 rounded-lg border border-border bg-surface p-0.5">
      {(["fr", "ar", "en"] as Locale[]).map((l) => (
        <button
          key={l}
          onClick={() => { document.cookie = `masar_lang=${l}; path=/; max-age=31536000; samesite=lax`; window.location.reload(); }}
          className={`rounded-md px-2 py-1 text-[11.5px] font-semibold transition-colors ${locale === l ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted"}`}
          aria-label={LOCALE_LABELS[l].native}
        >
          {LOCALE_LABELS[l].short}
        </button>
      ))}
    </div>
  );
}
