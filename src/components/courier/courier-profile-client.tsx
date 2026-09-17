"use client";

import * as React from "react";
import Link from "next/link";
import { Copy, KeyRound, Pencil, ShieldCheck, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { changeCourierPasswordAction, updateCourierProfileAction } from "@/server/actions";

export function CourierProfileClient({
  name, phone, email, vehicle, zones, employeeCode, status, lastSeenAt, delivered, successRate, earnings, cities,
}: {
  name: string; phone: string; email: string; vehicle: string; zones: string[]; employeeCode: string;
  status: string; lastSeenAt: string | null; delivered: number; successRate: number; earnings: number; cities: string[];
}) {
  const { t, money, date, pct } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [editOpen, setEditOpen] = React.useState(false);
  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [profile, setProfile] = React.useState({ name, phone, vehicle, zones });
  const [password, setPassword] = React.useState({ current: "", next: "" });

  async function saveProfile() {
    setBusy(true);
    const result = await updateCourierProfileAction(profile);
    setBusy(false);
    toast.push({ title: result.ok ? t("settings.saved") : result.message ?? t("common.errorTitle"), variant: result.ok ? "success" : "error" });
    if (result.ok) { setEditOpen(false); router.refresh(); }
  }

  async function savePassword() {
    setBusy(true);
    const result = await changeCourierPasswordAction(password);
    setBusy(false);
    toast.push({ title: result.ok ? t("settings.passwordChanged") : result.message ?? t("common.errorTitle"), variant: result.ok ? "success" : "error" });
    if (result.ok) { setPassword({ current: "", next: "" }); setPasswordOpen(false); }
  }

  function copy(value: string, label: string) {
    void navigator.clipboard?.writeText(value);
    toast.push({ title: `${label} copié`, variant: "success" });
  }

  function toggleZone(city: string) {
    setProfile((current) => ({ ...current, zones: current.zones.includes(city) ? current.zones.filter((zone) => zone !== city) : [...current.zones, city] }));
  }

  return (
    <>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {[["Livrées", delivered], ["Réussite", pct(successRate, 0)], ["Gains", money(earnings, { compact: true })]].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-border bg-surface p-3 text-center shadow-xs"><p className="text-[10.5px] text-muted-foreground">{label}</p><p className="mt-1 text-[16px] font-semibold tnum">{value}</p></div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="size-3.5" /> Modifier</Button>
        <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}><KeyRound className="size-3.5" /> Sécurité</Button>
        <Link href="/courier/earnings" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[12px] font-medium shadow-xs"><WalletCards className="size-3.5" /> Gains</Link>
        <a href="tel:+212522000000" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[12px] font-medium shadow-xs"><ShieldCheck className="size-3.5" /> Support</a>
      </div>

      <div className="mt-3 space-y-2 rounded-xl border border-border bg-surface p-3 shadow-xs">
        <div className="flex items-center justify-between gap-2 text-[12px]"><span className="text-muted-foreground">Email</span><span className="truncate font-medium" dir="ltr">{email}</span></div>
        <div className="flex items-center justify-between gap-2 text-[12px]"><span className="text-muted-foreground">Compte</span><span className="font-medium">{status === "ACTIVE" ? "Actif" : status}</span></div>
        <div className="flex items-center justify-between gap-2 text-[12px]"><span className="text-muted-foreground">Dernière activité</span><span className="font-medium">{lastSeenAt ? date(lastSeenAt) : "Jamais"}</span></div>
        <button onClick={() => copy(employeeCode, "Code employé")} className="flex w-full items-center justify-between border-t border-border pt-2 text-[12px]"><span className="text-muted-foreground">Code employé</span><span className="flex items-center gap-1 font-medium tnum"><Copy className="size-3" />{employeeCode}</span></button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent size="sm">
          <DialogTitle>Modifier le profil</DialogTitle>
          <DialogDescription>Modifiez vos informations et vos préférences de tournée.</DialogDescription>
          <div className="mt-4 space-y-3">
            <Field label={t("common.name")}><Input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} /></Field>
            <Field label={t("common.phone")}><Input value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} dir="ltr" /></Field>
            <Field label={t("common.vehicle")}><Select value={profile.vehicle} onChange={(event) => setProfile((current) => ({ ...current, vehicle: event.target.value }))}>{["MOTORCYCLE", "CAR", "VAN"].map((value) => <option key={value} value={value}>{t(`vehicle.${value}`)}</option>)}</Select></Field>
            <Field label={t("courier.zones")}>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-border p-2">
                {cities.map((city) => <button type="button" key={city} onClick={() => toggleZone(city)} className={`rounded-md border px-2 py-1 text-[11px] ${profile.zones.includes(city) ? "border-primary/40 bg-primary-soft text-primary" : "border-border text-muted-foreground"}`}>{city}</button>)}
              </div>
            </Field>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setEditOpen(false)}>Annuler</Button><Button disabled={busy || !profile.name || !profile.phone || profile.zones.length === 0} onClick={saveProfile}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent size="sm"><DialogTitle>Changer le mot de passe</DialogTitle><DialogDescription>Utilisez au moins 8 caractères.</DialogDescription><div className="mt-4 space-y-3"><Field label="Mot de passe actuel"><Input type="password" value={password.current} onChange={(event) => setPassword((current) => ({ ...current, current: event.target.value }))} /></Field><Field label="Nouveau mot de passe"><Input type="password" value={password.next} onChange={(event) => setPassword((current) => ({ ...current, next: event.target.value }))} /></Field></div><DialogFooter><Button variant="ghost" onClick={() => setPasswordOpen(false)}>Annuler</Button><Button disabled={busy || password.next.length < 8 || !password.current} onClick={savePassword}>Enregistrer</Button></DialogFooter></DialogContent>
      </Dialog>
    </>
  );
}
