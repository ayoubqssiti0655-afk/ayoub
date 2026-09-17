"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Select, Textarea, Field } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { openDisputeAction } from "@/server/actions";

/** Open a dispute (litige) on an order. */
export function DisputeButton({ orderId, disabled }: { orderId: string; disabled?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState("DAMAGED");
  const [description, setDescription] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  return (
    <>
      <Button size="sm" variant="ghost" className="text-error" disabled={disabled} onClick={() => setOpen(true)}>
        <Scale className="size-3.5" /> {t("dispute.open")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogTitle>{t("dispute.open")}</DialogTitle>
          <DialogDescription>{t("dispute.description")}</DialogDescription>
          <div className="mt-3 space-y-3">
            <Field label={t("dispute.type")}>
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                {["DAMAGED", "LOST", "WRONG_ITEM", "OTHER"].map((x) => (
                  <option key={x} value={x}>{t(`dispute.type.${x}`)}</option>
                ))}
              </Select>
            </Field>
            <Field label={t("dispute.description")}>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button
              variant="destructive"
              disabled={busy || description.trim().length < 5}
              onClick={async () => {
                setBusy(true);
                const res = await openDisputeAction(orderId, type, description.trim());
                setBusy(false);
                toast.push({ title: res.ok ? t("dispute.opened") : res.message ?? t("common.errorTitle"), variant: res.ok ? "success" : "error" });
                if (res.ok) { setOpen(false); router.refresh(); }
              }}
            >
              {t("dispute.open")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
