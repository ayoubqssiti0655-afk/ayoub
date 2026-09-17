"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store, Bike } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input, Field, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function RegisterForm({ cities }: { cities: string[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [accountType, setAccountType] = React.useState<"MERCHANT" | "COURIER">("MERCHANT");
  const [vehicle, setVehicle] = React.useState<"MOTORCYCLE" | "CAR" | "VAN">("MOTORCYCLE");
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    password: "",
    city: cities[0] ?? "Casablanca",
    phone: "",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          accountType,
          vehicle: accountType === "COURIER" ? vehicle : undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        const dest = json.data?.redirect ?? (accountType === "COURIER" ? "/courier" : "/app");
        router.push(dest);
        router.refresh();
      } else {
        setError(json.error?.message ?? t("common.errorDesc"));
      }
    } catch {
      setError(t("common.errorDesc"));
    }
    setBusy(false);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo />
        <h1 className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">
          {accountType === "MERCHANT" ? t("auth.signUpTitle") : t("auth.signUpCourierTitle")}
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {accountType === "MERCHANT" ? t("auth.signUpDesc") : t("auth.signUpCourierDesc")}
        </p>
      </div>

      {/* Account Type Selector (Merchant vs Courier) */}
      <div className="mb-5 grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => { setAccountType("MERCHANT"); setError(null); }}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
            accountType === "MERCHANT"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Store className="size-4" />
          <span>{t("auth.roleMerchant")}</span>
        </button>
        <button
          type="button"
          onClick={() => { setAccountType("COURIER"); setError(null); }}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
            accountType === "COURIER"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Bike className="size-4" />
          <span>{t("auth.roleCourier")}</span>
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3.5">
        <Field label={accountType === "MERCHANT" ? t("auth.businessName") : t("auth.fullName")}>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            minLength={2}
            autoFocus
            placeholder={accountType === "MERCHANT" ? "Zellige Store" : "Youssef El Amrani"}
          />
        </Field>

        {accountType === "COURIER" && (
          <Field label={t("auth.vehicle")}>
            <Select
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value as "MOTORCYCLE" | "CAR" | "VAN")}
            >
              <option value="MOTORCYCLE">{t("auth.vehicle.MOTORCYCLE")}</option>
              <option value="CAR">{t("auth.vehicle.CAR")}</option>
              <option value="VAN">{t("auth.vehicle.VAN")}</option>
            </Select>
          </Field>
        )}

        <Field label={t("common.email")}>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
            dir="ltr"
            placeholder="contact@example.com"
          />
        </Field>

        <Field label={t("common.phone")} hint="06 12 34 56 78">
          <Input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            required
            placeholder="0612345678"
            inputMode="tel"
            dir="ltr"
          />
        </Field>

        <Field label={t("common.city")}>
          <Select value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>

        <Field label={t("auth.password")} hint="Min. 8 characters">
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
            minLength={8}
            dir="ltr"
          />
        </Field>

        {error && <p className="rounded-lg bg-error-soft px-3 py-2 text-[12.5px] font-medium text-error">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy
            ? t("common.loading")
            : accountType === "MERCHANT"
            ? t("auth.registerCta")
            : t("auth.registerCourierCta")}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">{t("auth.signIn")}</Link>
      </p>
    </div>
  );
}
