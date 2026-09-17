"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCheck, PackageCheck, RotateCcw, Send, Truck, UserPlus } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  cancelOrderAction, assignCourierAction, addOrderNoteAction, retryDeliveryAction, createReturnAction,
} from "@/server/actions";

export function OrderActions({
  orderId,
  status,
  courierId,
  attemptCount,
  couriers,
}: {
  orderId: string;
  status: string;
  courierId?: string | null;
  attemptCount: number;
  couriers: { id: string; name: string; city: string }[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = React.useState<null | "cancel" | "assign" | "retry" | "return">(null);
  const [courier, setCourier] = React.useState(courierId ?? "");
  const [note, setNote] = React.useState("");
  const [reason, setReason] = React.useState("Colis refusé après 3 tentatives");
  const [pending, setPending] = React.useState(false);
  const [busyNote, setBusyNote] = React.useState(false);

  async function run(fn: () => Promise<{ ok: boolean; message?: string }> | (() => Promise<{ ok: boolean; message?: string }>), close = true) {
    setPending(true);
    const res = await (typeof fn === "function" ? (fn as () => Promise<{ ok: boolean; message?: string }>)() : fn);
    setPending(false);
    toast.push({ title: res.ok ? t("settings.saved") : res.message ?? t("common.errorTitle"), variant: res.ok ? "success" : "error" });
    if (res.ok && close) setDialog(null);
    if (res.ok) router.refresh();
    return res.ok;
  }

  React.useEffect(() => {
    // Poll every 6 seconds to keep order status live
    const interval = setInterval(() => {
      router.refresh();
    }, 6000);
    return () => clearInterval(interval);
  }, [router]);

  const cityCouriers = [...couriers].sort((a, b) => (a.city === b.city ? 0 : a.city === "Casablanca" ? -1 : 1));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "NEW" && (
        <Button size="sm" disabled={pending} onClick={() => run(() => transitionWrap(orderId, "confirm"))}>
          <CheckCheck className="size-3.5" /> {t("common.confirm")}
        </Button>
      )}
      {status === "CONFIRMED" && (
        <Button size="sm" disabled={pending} onClick={() => run(() => transitionWrap(orderId, "ready"))}>
          <PackageCheck className="size-3.5" /> {t("orders.bulkReady")}
        </Button>
      )}
      {["NEW", "CONFIRMED", "READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT", "FAILED"].includes(status) && (
        <Button size="sm" variant="outline" onClick={() => setDialog("assign")}>
          <UserPlus className="size-3.5" /> {courierId ? t("order.detail.changeCourier") : t("common.assignCourier")}
        </Button>
      )}
      {status === "FAILED" && (
        <>
          <Button size="sm" variant="outline" onClick={() => setDialog("retry")}>
            <Truck className="size-3.5" /> {t("order.detail.retryDelivery")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDialog("return")}>
            <RotateCcw className="size-3.5" /> {t("order.detail.createReturn")}
          </Button>
        </>
      )}
      {["NEW", "CONFIRMED", "READY_FOR_PICKUP"].includes(status) && (
        <Button size="sm" variant="ghost" className="text-error" onClick={() => setDialog("cancel")}>
          <Ban className="size-3.5" /> {t("common.cancel")}
        </Button>
      )}

      {/* assign dialog */}
      <Dialog open={dialog === "assign"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent size="sm">
          <DialogTitle>{t("common.assignCourier")}</DialogTitle>
          <DialogDescription>{t("deliveries.assignDesc")}</DialogDescription>
          <div className="mt-3">
            <Select value={courier} onChange={(e) => setCourier(e.target.value)}>
              <option value="">{t("common.selectCourier")}</option>
              {cityCouriers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.city}</option>
              ))}
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>{t("common.cancel")}</Button>
            <Button
              disabled={!courier || pending}
              onClick={async () => {
                if (!courier) return;
                await run(() => assignCourierAction(orderId, courier));
                setDialog(null);
              }}
            >
              <Send className="size-3.5" /> {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* cancel dialog */}
      <Dialog open={dialog === "cancel"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent size="sm">
          <DialogTitle>{t("common.cancel")} — {t("common.order")}</DialogTitle>
          <DialogDescription>{t("order.detail.cancelDesc")}</DialogDescription>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>{t("common.back")}</Button>
            <Button variant="destructive" disabled={pending} onClick={async () => { await run(() => cancelOrderAction(orderId)); setDialog(null); }}>
              {t("orders.bulkCancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* retry dialog */}
      <Dialog open={dialog === "retry"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent size="sm">
          <DialogTitle>{t("order.detail.retryDelivery")}</DialogTitle>
          <DialogDescription>{t("order.detail.retryDesc")}</DialogDescription>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>{t("common.back")}</Button>
            <Button disabled={pending} onClick={async () => { await run(() => retryDeliveryAction(orderId)); setDialog(null); }}>
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* return dialog */}
      <Dialog open={dialog === "return"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent size="sm">
          <DialogTitle>{t("returns.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("returns.dialogDesc")}</DialogDescription>
          <div className="mt-3 space-y-3">
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              {["Colis refusé après 3 tentatives", "Client injoignable après 3 tentatives", "Adresse introuvable", "Produit non conforme à la commande", "Annulé par le client"].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("courier.notePlaceholder")} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>{t("common.cancel")}</Button>
            <Button disabled={pending} onClick={async () => { await run(() => createReturnAction(orderId, reason, note)); setDialog(null); }}>
              {t("returns.dialogTitle")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function transitionWrap(orderId: string, kind: "confirm" | "ready") {
  return async () => {
    if (kind === "confirm") {
      const { confirmOrdersAction } = await import("@/server/actions");
      return confirmOrdersAction([orderId]);
    }
    const { markReadyAction } = await import("@/server/actions");
    return markReadyAction([orderId]);
  };
}

export function NoteComposer({ orderId }: { orderId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="space-y-2">
      <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("order.detail.notePlaceholder")} />
      <Button
        size="sm"
        disabled={busy || note.trim().length < 2}
        onClick={async () => {
          setBusy(true);
          const res = await addOrderNoteAction(orderId, note.trim());
          setBusy(false);
          if (res.ok) { setNote(""); toast.push({ title: t("settings.saved"), variant: "success" }); router.refresh(); }
        }}
      >
        {t("order.detail.post")}
      </Button>
    </div>
  );
}
