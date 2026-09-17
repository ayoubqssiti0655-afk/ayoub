"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Send } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { adminAssignCourierAction } from "@/server/admin-actions";

export function AdminOrderActions({ orderId, courierId, couriers }: {
  orderId: string; courierId?: string | null; couriers: { id: string; name: string; city: string }[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [courier, setCourier] = React.useState(courierId ?? "");
  const [busy, setBusy] = React.useState(false);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="size-3.5" /> {courierId ? t("order.detail.changeCourier") : t("common.assignCourier")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogTitle>{t("common.assignCourier")}</DialogTitle>
          <DialogDescription>{t("deliveries.assignDesc")}</DialogDescription>
          <div className="mt-3">
            <Select value={courier} onChange={(e) => setCourier(e.target.value)}>
              <option value="">{t("common.selectCourier")}</option>
              {couriers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.city}</option>)}
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button
              disabled={!courier || busy}
              onClick={async () => {
                setBusy(true);
                const res = await adminAssignCourierAction(orderId, courier);
                setBusy(false);
                toast.push({ title: res.ok ? t("deliveries.assigned") : res.message ?? t("common.errorTitle"), variant: res.ok ? "success" : "error" });
                if (res.ok) { setOpen(false); router.refresh(); }
              }}
            >
              <Send className="size-3.5" /> {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
