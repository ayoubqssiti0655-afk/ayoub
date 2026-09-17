"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";


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

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">{t("auth.signUp")}</Link>
      </p>
    </div>
  );
}
