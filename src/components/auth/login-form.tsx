"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

const DEMO = [
  { role: "MERCHANT", email: "merchant@masar.ma", name: "Zellige Store" },
  { role: "ADMIN", email: "admin@masar.ma", name: "Masar HQ" },
  { role: "COURIER", email: "courier@masar.ma", name: "Youssef E." },
];

export function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (res.ok) {
        router.push(sp.get("next") ?? json.data.redirect ?? "/app");
        router.refresh();
      } else {
        setError(json.error?.code === "SUSPENDED" ? t("auth.suspended") : t("auth.invalidCreds"));
      }
    } catch {
      setError(t("common.errorDesc"));
    }
    setBusy(false);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center">
        <Logo />
        <h1 className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">{t("auth.signInTitle")}</h1>
        <p className="mt-1 text-center text-[13px] text-muted-foreground">{t("auth.signInDesc")}</p>
      </div>

      <form onSubmit={submit} className="space-y-3.5">
        <Field label={t("auth.email")}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="email" dir="ltr" />
        </Field>
        <Field label={t("auth.password")}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" dir="ltr" />
        </Field>
        {error && <p className="rounded-lg bg-error-soft px-3 py-2 text-[12.5px] font-medium text-error">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? t("common.loading") : t("auth.signIn")}
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-border bg-surface-2 p-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">{t("auth.demoAccounts")}</p>
        <p className="mt-1 text-[11.5px] text-muted-foreground">{t("auth.demoHint", { password: "Demo1234!" })}</p>
        <div className="mt-2.5 grid gap-1.5">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => { setEmail(d.email); setPassword("Demo1234!"); }}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-start transition-colors hover:border-primary/40"
            >
              <span>
                <span className="block text-[12.5px] font-medium">{d.name}</span>
                <span className="block text-[11px] text-faint" dir="ltr">{d.email}</span>
              </span>
              <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[10.5px] font-semibold text-primary">{t("auth.use")}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">{t("auth.signUp")}</Link>
      </p>
    </div>
  );
}
