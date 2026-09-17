"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PhoneForwarded, AlertTriangle, Check, RefreshCw } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Field } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { relanceOrderAction } from "@/server/actions";

export function OrderRelanceDialog({
  orderId,
  reference,
  status,
  customerPhone,
  deliveryAddress,
  failureReason,
  enabled = true,
}: {
  orderId: string;
  reference: string;
  status: string;
  customerPhone: string;
  deliveryAddress: string;
  failureReason?: string | null;
  enabled?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();

  const [open, setOpen] = React.useState(false);
  const [phone, setPhone] = React.useState(customerPhone);
  const [address, setAddress] = React.useState(deliveryAddress);
  const [notes, setNotes] = React.useState("");
  const [nextDate, setNextDate] = React.useState("");
  const [pending, setPending] = React.useState(false);

  if (!enabled) return null;

  const isFailed = status === "FAILED" || !!failureReason;
  if (!isFailed) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await relanceOrderAction({
      orderId,
      phone: phone !== customerPhone ? phone : undefined,
      address: address !== deliveryAddress ? address : undefined,
      notes,
      nextDate: nextDate || undefined,
    });
    setPending(false);

    if (res.ok) {
      toast.push({
        title: "Relance SAV enregistrée avec succès — La commande a été réactivée",
        variant: "success",
      });
      setOpen(false);
      router.refresh();
    } else {
      toast.push({
        title: res.message ?? "Erreur lors de la relance",
        variant: "error",
      });
    }
  }

  return (
    <>
      {/* Failed Delivery Alert Card with Quick Relance Trigger */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-error/30 bg-error/5 p-4 text-error">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-error/10 p-2 text-error">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h3 className="text-[13.5px] font-bold text-foreground">
              Colis en échec de livraison / شحنة متعثرة
            </h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Motif: <strong className="text-error">{failureReason || "Non livré (Pas de réponse / Injoignable)"}</strong>
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-error hover:bg-error/90 text-white font-bold shadow-sm"
          size="sm"
        >
          <PhoneForwarded className="size-3.5" />
          <span>Relancer la livraison (SAV)</span>
        </Button>
      </div>

      {/* Relance Modal Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-[16px] font-bold">
                <PhoneForwarded className="size-4 text-primary" />
                <span>Relance SAV • {reference}</span>
              </DialogTitle>
              <DialogDescription className="text-[12px] mt-1 text-muted-foreground">
                Renseignez un nouveau numéro de contact ou des consignes d&apos;accès pour reprogrammer la tournée du livreur.
              </DialogDescription>
            </div>

            <div className="space-y-3 pt-1">
              <Field label="Téléphone de contact / Nouveau numéro">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="06XXXXXXXX ou 07XXXXXXXX"
                  dir="ltr"
                />
              </Field>

              <Field label="Adresse de livraison / Quartier">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Quartier, rue, n° immeuble..."
                />
              </Field>

              <Field label="Instructions & précisions pour le livreur (SAV)">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Le client sera disponible demain après 15h, sonner chez le concierge..."
                  rows={2}
                />
              </Field>

              <Field label="Date de nouvelle tentative souhaitée">
                <Input
                  type="date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </Field>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending} className="font-semibold shadow-sm">
                {pending ? "Enregistrement..." : "Confirmer et relancer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

