"use client";

import * as React from "react";
import { CalendarClock, Star, MapPin, Check } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Slot = { date: string; window: string; label: string };

/** Customer delivery-window chooser + pickup point + post-delivery rating. */
export function TrackingExtras({
  reference,
  mode,
  slot,
  points,
  hasRated,
  rating,
}: {
  reference: string;
  mode: "slot" | "relais" | "rate";
  slot?: { date: string; window: string } | null;
  points?: { id: string; name: string; address: string; phone: string }[];
  hasRated?: boolean;
  rating?: number | null;
}) {
  const { t, date } = useI18n();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [chosen, setChosen] = React.useState(slot ?? null);
  const [chosenPoint, setChosenPoint] = React.useState<string | null>(null);
  const [stars, setStars] = React.useState(rating ?? 0);
  const [comment, setComment] = React.useState("");
  const [done, setDone] = React.useState<null | "slot" | "relais" | "rating">(null);

  const dayLabel = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);
    if (d.getTime() === today.getTime()) return t("slot.today");
    if (d.getTime() === tomorrow.getTime()) return t("slot.tomorrow");
    return date(d);
  };

  function slotOptions(): Slot[] {
    const out: Slot[] = [];
    const base = new Date();
    for (const dayOffset of [0, 1]) {
      const d = new Date(base.getTime() + dayOffset * 86400000);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      for (const w of ["10h-12h", "14h-16h", "16h-18h", "18h-20h"]) {
        out.push({ date: iso, window: w, label: `${dayLabel(iso)} · ${w}` });
      }
    }
    return out;
  }

  async function post(payload: Record<string, unknown>, key: string) {
    setBusy(key);
    try {
      const res = await fetch(`/api/v1/tracking/${encodeURIComponent(reference)}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setDone(key as any);
        if (key === "slot") setChosen({ date: payload.date as string, window: payload.window as string });
      }
    } catch {}
    setBusy(null);
  }

  // ── slot chooser ──
  if (mode === "slot") {
    return (
      <div className="rounded-2xl border border-primary/25 bg-surface p-4 shadow-xs">
        <h2 className="flex items-center gap-2 text-[13.5px] font-semibold">
          <CalendarClock className="size-4 text-primary" /> {t("slot.title")}
        </h2>
        <p className="mt-1 text-[12px] text-muted-foreground">{t("slot.desc")}</p>
        {chosen ? (
          <p className="mt-3 flex items-center gap-2 rounded-xl border border-success/30 bg-success-soft px-3 py-2.5 text-[13px] font-semibold text-success">
            <Check className="size-4" /> {t("slot.chosen")} : {dayLabel(chosen.date)} · {chosen.window}
          </p>
        ) : done === "slot" ? (
          <p className="mt-3 rounded-xl bg-success-soft px-3 py-2.5 text-[13px] font-medium text-success">{t("slot.done")}</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {slotOptions().map((s) => (
              <button
                key={s.date + s.window}
                disabled={busy === "slot"}
                onClick={() => post({ action: "slot", date: s.date, window: s.window }, "slot")}
                className="rounded-xl border border-border px-3 py-2.5 text-[12.5px] font-medium transition-colors hover:border-primary/50 hover:bg-primary-soft hover:text-primary"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── pickup points ──
  if (mode === "relais") {
    if (!points?.length) return null;
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
        <h2 className="flex items-center gap-2 text-[13.5px] font-semibold">
          <MapPin className="size-4 text-info" /> {t("relais.title")}
        </h2>
        <p className="mt-1 text-[12px] text-muted-foreground">{t("relais.desc")}</p>
        {chosenPoint ? (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2.5 text-[13px] font-medium text-success">
            <Check className="size-4" /> {t("relais.chosen")}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {points.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold">{p.name}</p>
                  <p className="truncate text-[12px] text-muted-foreground">{p.address}</p>
                </div>
                <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => post({ action: "relais", pickupPointId: p.id }, p.id)}>
                  {t("relais.choose")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ── rating ──
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-xs" id="rate">
      <h2 className="text-[13.5px] font-semibold">{t("rating.title")}</h2>
      {done === "rating" || hasRated ? (
        <p className="mt-2 rounded-xl bg-success-soft px-3 py-2.5 text-[13px] font-medium text-success">
          <Check className="me-1 inline size-4" /> {t("rating.thanks")}
        </p>
      ) : (
        <>
          <div className="mt-2.5 flex justify-center gap-1.5" dir="ltr">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => setStars(s)} aria-label={`${s} ★`}>
                <Star
                  className={cn("size-8 transition-transform hover:scale-110", s <= stars ? "fill-warning text-warning" : "text-border-strong")}
                />
              </button>
            ))}
          </div>
          {stars > 0 && (
            <div className="mt-3 space-y-2">
              <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("rating.comment")} />
              <Button
                className="w-full"
                disabled={busy === "rating"}
                onClick={() => post({ action: "rating", stars, comment: comment || undefined }, "rating")}
              >
                {t("common.confirm")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
