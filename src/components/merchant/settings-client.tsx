"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { Tabs, TabsList, TabsTrigger, TabsContent, Switch, Avatar } from "@/components/ui/misc";
import { Input, Select, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateProfileAction, updateStoreAction, changePasswordAction } from "@/server/actions";
import { avatarHue } from "@/lib/format";
import { LOCALE_LABELS, type Locale } from "@/i18n/config";

export type StaffRow = { id: string; name: string; email: string; role: string; active: boolean };

export function SettingsClient({
  user,
  store,
  cycleLocked = false,
  staff,
}: {
  user: { name: string; email: string; phone: string | null };
  store: { name: string; city: string | null; address: string | null; settlementCycle: string; plan: string; status: string };
  cycleLocked?: boolean;
  staff: StaffRow[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [profile, setProfile] = React.useState({ name: user.name, phone: user.phone ?? "" });
  const [storeForm, setStoreForm] = React.useState({
    name: store.name, city: store.city ?? "", address: store.address ?? "", settlementCycle: store.settlementCycle,
  });
  const [pw, setPw] = React.useState({ current: "", next: "" });
  const [notifs, setNotifs] = React.useState({ orders: true, delivery: true, finance: true });
  const [busy, setBusy] = React.useState(false);
  const [locale, setLocale] = React.useState<Locale>((document.documentElement.getAttribute("lang") as Locale) ?? "fr");

  function toastOk(ok: boolean) {
    toast.push({ title: ok ? t("settings.saved") : t("common.errorTitle"), variant: ok ? "success" : "error" });
    if (ok) router.refresh();
  }

  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">{t("settings.tabProfile")}</TabsTrigger>
        <TabsTrigger value="store">{t("settings.tabStore")}</TabsTrigger>
        <TabsTrigger value="team">{t("settings.tabTeam")}</TabsTrigger>
        <TabsTrigger value="notifications">{t("settings.tabNotifications")}</TabsTrigger>
        <TabsTrigger value="security">{t("settings.tabSecurity")}</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-4 max-w-xl space-y-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} size={48} hue={avatarHue(user.name)} />
          <div>
            <p className="text-[14px] font-semibold">{user.name}</p>
            <p className="text-[12.5px] text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Field label={t("common.name")}>
          <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
        </Field>
        <Field label={t("common.phone")}>
          <Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} dir="ltr" />
        </Field>
        <Field label={t("common.language")}>
          <Select
            value={locale}
            onChange={(e) => {
              const l = e.target.value as Locale;
              setLocale(l);
              document.cookie = `masar_lang=${l}; path=/; max-age=31536000; samesite=lax`;
              router.refresh();
            }}
          >
            {(Object.keys(LOCALE_LABELS) as Locale[]).map((l) => (
              <option key={l} value={l}>{LOCALE_LABELS[l].native}</option>
            ))}
          </Select>
        </Field>
        <Button
          disabled={busy}
          onClick={async () => { setBusy(true); const res = await updateProfileAction(profile); setBusy(false); toastOk(res.ok); }}
        >
          {t("common.saveChanges")}
        </Button>
      </TabsContent>

      <TabsContent value="store" className="mt-4 max-w-xl space-y-4">
        <Field label={t("auth.businessName")}>
          <Input value={storeForm.name} onChange={(e) => setStoreForm((s) => ({ ...s, name: e.target.value }))} />
        </Field>
        <Field label={t("common.city")}>
          <Input value={storeForm.city} onChange={(e) => setStoreForm((s) => ({ ...s, city: e.target.value }))} />
        </Field>
        <Field label={t("common.address")}>
          <Input value={storeForm.address} onChange={(e) => setStoreForm((s) => ({ ...s, address: e.target.value }))} />
        </Field>
        <Field label={t("settings.settlementCycle")} hint={cycleLocked ? t("settings.cycleLockedHint") : undefined}>
          <Select
            value={storeForm.settlementCycle}
            disabled={cycleLocked}
            onChange={(e) => setStoreForm((s) => ({ ...s, settlementCycle: e.target.value }))}
          >
            {["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"].map((c) => <option key={c} value={c}>{t(`cycle.${c}`)}</option>)}
          </Select>
        </Field>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[12.5px]">
          <span className="text-muted-foreground">{t("plan." + store.plan)}</span>
          <span className="ms-auto"><span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px]">{t(`status.${store.status}`)}</span></span>
        </div>
        <Button
          disabled={busy}
          onClick={async () => { setBusy(true); const res = await updateStoreAction(storeForm); setBusy(false); toastOk(res.ok); }}
        >
          {t("common.saveChanges")}
        </Button>
      </TabsContent>

      <TabsContent value="team" className="mt-4 max-w-xl">
        <p className="mb-3 text-[13px] text-muted-foreground">{t("settings.teamDesc")}</p>
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface shadow-xs">
          {staff.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={m.name} size={32} hue={avatarHue(m.name)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{m.name}</p>
                <p className="truncate text-[12px] text-muted-foreground">{m.email}</p>
              </div>
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11.5px] text-muted-foreground">{t(`staffRole.${m.role}`)}</span>
            </li>
          ))}
        </ul>
      </TabsContent>

      <TabsContent value="notifications" className="mt-4 max-w-xl space-y-3">
        <p className="text-[13px] text-muted-foreground">{t("settings.notifDesc")}</p>
        {([
          ["orders", t("settings.notifOrders"), t("settings.notifOrdersDesc")],
          ["delivery", t("settings.notifDelivery"), t("settings.notifDeliveryDesc")],
          ["finance", t("settings.notifFinance"), t("settings.notifFinanceDesc")],
        ] as const).map(([key, title, desc]) => (
          <div key={key} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 shadow-xs">
            <div>
              <p className="text-[13px] font-medium">{title}</p>
              <p className="text-[12px] text-muted-foreground">{desc}</p>
            </div>
            <Switch checked={notifs[key]} onCheckedChange={(v) => setNotifs((n) => ({ ...n, [key]: v }))} />
          </div>
        ))}
      </TabsContent>

      <TabsContent value="security" className="mt-4 max-w-sm space-y-4">
        <Field label={t("settings.currentPassword")}>
          <Input type="password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
        </Field>
        <Field label={t("settings.newPassword")} hint="Min. 8 characters">
          <Input type="password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
        </Field>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const res = await changePasswordAction(pw);
            setBusy(false);
            if (res.ok) { setPw({ current: "", next: "" }); toastOk(true); }
            else toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
          }}
        >
          {t("common.saveChanges")}
        </Button>
      </TabsContent>
    </Tabs>
  );
}
