"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updatePricingRulesAction } from "@/server/admin-actions";

export function PricingClient({
  config,
}: {
  config: { weightSurchargePerKg: number; remoteMultiplier: number; codFeePct: number; courierFeeDefault: number };
}) {
  const { t, money } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = React.useState({
    weight: (config.weightSurchargePerKg / 100).toFixed(2),
    remote: String(config.remoteMultiplier),
    codFee: String(config.codFeePct),
    courier: (config.courierFeeDefault / 100).toFixed(2),
  });
  const [busy, setBusy] = React.useState(false);

  return (
    <Card className="max-w-xl">
      <CardContent className="space-y-4 p-4">
        <Field label={`${t("admin.pricing.weightSurcharge")} (DH)`} hint={`+ ${form.weight} DH / kg > 1kg`}>
          <Input value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))} dir="ltr" />
        </Field>
        <Field label={t("admin.pricing.remoteMultiplier")} hint={`fee × ${form.remote} for remote zones`}>
          <Input value={form.remote} onChange={(e) => setForm((f) => ({ ...f, remote: e.target.value }))} dir="ltr" />
        </Field>
        <Field label={t("admin.pricing.codFee")} hint="% of parcel value">
          <Input value={form.codFee} onChange={(e) => setForm((f) => ({ ...f, codFee: e.target.value }))} dir="ltr" />
        </Field>
        <Field label={`${t("admin.pricing.courierFee")} (DH)`} hint={money(Math.round(Number(form.courier.replace(",", ".")) * 100))}>
          <Input value={form.courier} onChange={(e) => setForm((f) => ({ ...f, courier: e.target.value }))} dir="ltr" />
        </Field>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const res = await updatePricingRulesAction({
              weightSurchargePerKg: Math.round(Number(form.weight.replace(",", ".")) * 100),
              remoteMultiplier: Number(form.remote.replace(",", ".")) || 1,
              codFeePct: Number(form.codFee.replace(",", ".")) || 0,
              courierFeeDefault: Math.round(Number(form.courier.replace(",", ".")) * 100),
            });
            setBusy(false);
            toast.push({ title: res.ok ? t("admin.pricing.saved") : t("common.errorTitle"), variant: res.ok ? "success" : "error" });
            if (res.ok) router.refresh();
          }}
        >
          {t("common.save")}
        </Button>
      </CardContent>
    </Card>
  );
}
