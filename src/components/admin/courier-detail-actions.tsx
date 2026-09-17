"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Settings2, Power } from "lucide-react";
import { updateCourierZonesAction, setCourierStatusAction } from "@/server/admin-actions";
import { cn } from "@/lib/utils";

export function CourierAdminActions({ id, status, zones, allCities }: {
  id: string; status: string; zones: string[]; allCities: string[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set(zones));
  const [busy, setBusy] = React.useState(false);

  function toggle(city: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(city)) next.delete(city);
      else next.add(city);
      return next;
    });
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Settings2 className="size-3.5" /> {t("admin.couriers.zones")}
      </Button>
      <Button
        size="sm"
        variant={status === "ACTIVE" ? "outline" : "default"}
        className={status === "ACTIVE" ? "text-error" : ""}
        onClick={async () => {
          const res = await setCourierStatusAction(id, status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
          if (res.ok) router.refresh();
        }}
      >
        <Power className="size-3.5" /> {status === "ACTIVE" ? t("status.INACTIVE") : t("status.ACTIVE")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogTitle>{t("admin.couriers.zones")}</DialogTitle>
          <DialogDescription>{t("deliveries.assignDesc")}</DialogDescription>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {allCities.map((city) => (
              <button
                key={city}
                onClick={() => toggle(city)}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                  selected.has(city) ? "border-primary/40 bg-primary-soft text-primary" : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {city}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button
              disabled={busy || selected.size === 0}
              onClick={async () => {
                setBusy(true);
                await updateCourierZonesAction(id, [...selected]);
                setBusy(false);
                setOpen(false);
                router.refresh();
              }}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
