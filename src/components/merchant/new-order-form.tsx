"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, ShoppingBasket, Trash2, ShieldCheck, ShieldAlert, ShieldQuestion, RefreshCcw, UserRoundCheck, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddressIQ } from "@/components/merchant/address-iq";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Label, Field } from "@/components/ui/input";
import { Switch } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { createOrderAction } from "@/server/actions";

export type CityFee = { name: string; fee: number };
type Product = { id: string; name: string; price: number; sku: string | null; stock: number };
type Item = { key: number; productId?: string; name: string; sku?: string; quantity: number; unitPrice: number };

export function NewOrderForm({
  products,
  cities,
  trustEnabled = true,
  exchangeEnabled = true,
  addressIQEnabled = true,
  allowOpenParcelEnabled = true,
}: {
  products: Product[];
  cities: CityFee[];
  trustEnabled?: boolean;
  exchangeEnabled?: boolean;
  addressIQEnabled?: boolean;
  allowOpenParcelEnabled?: boolean;
}) {
  const { t, money } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = React.useState<Item[]>([]);
  const [cod, setCod] = React.useState(true);
  const [allowOpenParcel, setAllowOpenParcel] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [trust, setTrust] = React.useState<{ found: boolean; fullName?: string; city?: string; address?: string; notes?: string; id?: string; trust?: { score: number; band: string; delivered: number; failed: number; returned: number } } | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [isExchange, setIsExchange] = React.useState(false);
  const [exchangeFor, setExchangeFor] = React.useState("");
  const nextKey = React.useRef(1);

  const [form, setForm] = React.useState({
    fullName: "", phone: "", secondaryPhone: "", city: "", address: "", postalCode: "", notes: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const cityFee = cities.find((c) => c.name === form.city)?.fee ?? null;

  async function lookupPhone() {
    const phone = form.phone.replace(/\s/g, "");
    if (!/^(\+212[67]\d{8}|0[67]\d{8})$/.test(phone)) { setTrust(null); return; }
    setChecking(true);
    try {
      const res = await fetch("/api/v1/customers/lookup?phone=" + encodeURIComponent(phone));
      const j = await res.json();
      setTrust(j.data);
    } catch { setTrust(null); }
    setChecking(false);
  }

  function addProduct(id: string) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { key: nextKey.current++, productId: p.id, name: p.name, sku: p.sku ?? undefined, quantity: 1, unitPrice: p.price }];
    });
  }
  function addCustom() {
    setItems((prev) => [...prev, { key: nextKey.current++, name: "", quantity: 1, unitPrice: 0 }]);
  }
  function patchItem(key: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }
  function removeItem(key: number) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  const itemsTotal = items.reduce((a, i) => a + i.quantity * i.unitPrice, 0);
  const discount = 0;
  const shippingFee = cod && cityFee != null ? cityFee : cityFee ?? 0;
  const total = itemsTotal + shippingFee - discount;
  const codAmount = cod ? total : 0;

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (form.fullName.trim().length < 3) e.fullName = t("common.required") || "Required";
    if (!/^(\+212[67]\d{8}|0[67]\d{8})$/.test(form.phone.replace(/\s/g, ""))) e.phone = t("order.new.phoneInvalid") || "06XXXXXXXX";
    if (!form.city) e.city = t("order.new.cityRequired") || "City is required";
    if (form.address.trim().length < 5) e.address = t("order.new.addressRequired") || "Address is required";
    if (!items.length || itemsTotal <= 0) e.items = t("order.new.itemsEmpty");
    if (items.some((i) => !i.name.trim() || i.unitPrice <= 0)) e.items = t("order.new.itemsEmpty");
    if (isExchange && exchangeFor.trim().length < 4) e.exchangeFor = t("tracking.notFoundDesc");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) {
      toast.push({ title: t("order.new.validationFailed") || "Please check required fields", variant: "error" });
      return;
    }
    setSaving(true);
    const res = await createOrderAction({
      customer: {
        id: trust?.found ? trust.id : undefined,
        fullName: form.fullName.trim(),
        phone: form.phone.replace(/\s/g, ""),
        secondaryPhone: form.secondaryPhone.replace(/\s/g, ""),
        city: form.city,
        address: form.address.trim(),
        postalCode: form.postalCode,
        notes: form.notes,
      },
      items: items.map((i) => ({ productId: i.productId, name: i.name.trim(), sku: i.sku, quantity: i.quantity, unitPrice: i.unitPrice })),
      shippingFee,
      discount,
      cod,
      notes: "",
      exchangeFor: isExchange ? exchangeFor.trim().toUpperCase() : "",
      allowOpenParcel: allowOpenParcelEnabled ? allowOpenParcel : undefined,
    });
    setSaving(false);
    if (res.ok && res.data) {
      toast.push({ title: t("order.new.success", { ref: res.data.reference }), variant: "success" });
      router.push(`/app/orders/${res.data.id}`);
    } else {
      toast.push({ title: res.message ?? "Error", variant: "error" });
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        {/* customer */}
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3.5 text-[13.5px] font-semibold">{t("order.new.customerSection")}</h2>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label={t("order.new.fullName")} error={errors.fullName}>
                <Input value={form.fullName} onChange={set("fullName")} placeholder="Youssef El Amrani" autoComplete="off" />
              </Field>
              <Field label={t("common.phone")} error={errors.phone} hint="06 12 34 56 78">
                <Input value={form.phone} onChange={set("phone")} onBlur={lookupPhone} placeholder="0612345678" inputMode="tel" dir="ltr" />
              </Field>
              {(checking || (trust && trustEnabled)) && (
                <div className="sm:col-span-2">
                  {checking ? (
                    <p className="text-[12px] text-faint">{t("common.loading")}</p>
                  ) : trust?.found && trust.trust ? (
                    <div className={`flex flex-wrap items-center gap-2.5 rounded-xl border p-3 ${trust.trust.band === "risky" ? "border-error/30 bg-error-soft" : trust.trust.band === "watch" ? "border-warning/30 bg-warning-soft" : trust.trust.band === "reliable" ? "border-success/30 bg-success-soft" : "border-border bg-surface-2"}`}>
                      {trust.trust.band === "risky" || trust.trust.band === "watch" ? (
                        <ShieldAlert className="size-5 shrink-0" style={{ color: trust.trust.band === "risky" ? "var(--error)" : "var(--warning)" }} />
                      ) : trust.trust.band === "reliable" ? (
                        <ShieldCheck className="size-5 shrink-0 text-success" />
                      ) : (
                        <ShieldQuestion className="size-5 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-[13px] font-semibold">
                          {t(`trust.${trust.trust.band}`)}
                          <span className="tnum">{trust.trust.score}/100</span>
                          <Badge tone="neutral" className="normal-case">{t("trust.known")}</Badge>
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                          {t("trust.desc", { score: trust.trust.score, delivered: trust.trust.delivered, failed: trust.trust.failed, returned: trust.trust.returned })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({
                          ...f,
                          fullName: trust.fullName || f.fullName,
                          city: trust.city || f.city,
                          address: trust.address || f.address,
                          notes: trust.notes || f.notes,
                        }))}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-[12px] font-medium shadow-xs hover:bg-muted"
                      >
                        <UserRoundCheck className="size-3.5" /> {t("trust.useProfile")}
                      </button>
                    </div>
                  ) : trust && !trust.found ? (
                    <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      <ShieldQuestion className="size-3.5" /> {t("trust.new")}
                    </p>
                  ) : null}
                </div>
              )}
              <Field label={`${t("order.new.secondaryPhone")} (${t("common.optional")})`}>
                <Input value={form.secondaryPhone} onChange={set("secondaryPhone")} placeholder="0712345678" inputMode="tel" dir="ltr" />
              </Field>
              <Field label={t("common.city")} error={errors.city}>
                <Select value={form.city} onChange={set("city")}>
                  <option value="">{t("common.select")}</option>
                  {cities.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t("common.address")} error={errors.address} className="sm:col-span-2">
                <Input value={form.address} onChange={set("address")} placeholder="Rue Mohammed V, Maârif" />
              </Field>
              {addressIQEnabled && (
                <div className="sm:col-span-2 -mt-2">
                  <AddressIQ address={form.address} city={form.city || undefined} />
                </div>
              )}
              <Field label={`${t("order.new.postalCode")} (${t("common.optional")})`}>
                <Input value={form.postalCode} onChange={set("postalCode")} placeholder="20000" inputMode="numeric" dir="ltr" />
              </Field>
              <Field label={`${t("order.new.customerNotes")} (${t("common.optional")})`}>
                <Input value={form.notes} onChange={set("notes")} placeholder={t("order.detail.notePlaceholder")} />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* items */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3.5 flex items-center justify-between gap-2">
              <h2 className="text-[13.5px] font-semibold">{t("order.new.orderSection")}</h2>
              <div className="flex items-center gap-2">
                <Select value="" onChange={(e) => addProduct(e.target.value)} className="w-52" aria-label={t("order.new.addProduct")}>
                  <option value="">{t("order.new.addProduct")}…</option>
                  {products.filter((p) => p.stock > 0).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
                <Button type="button" variant="outline" size="sm" onClick={addCustom}>
                  <Plus className="size-3.5" /> {t("order.new.customProduct")}
                </Button>
              </div>
            </div>
            {errors.items && <p className="mb-2 text-[12px] font-medium text-error">{errors.items}</p>}
            {items.length === 0 ? (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-border py-8 text-center">
                <ShoppingBasket className="mb-2 size-6 text-faint" strokeWidth={1.6} />
                <p className="text-[13px] text-muted-foreground">{t("order.new.itemsEmpty")}</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {items.map((it) => (
                  <li key={it.key} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-2 p-2.5">
                    {it.productId ? (
                      <div className="min-w-40 flex-1">
                        <p className="text-[13px] font-medium">{it.name}</p>
                        {it.sku && <p className="text-[11px] text-faint tnum">{it.sku}</p>}
                      </div>
                    ) : (
                      <Input
                        className="min-w-40 flex-1" placeholder={t("common.name")} value={it.name}
                        onChange={(e) => patchItem(it.key, { name: e.target.value })}
                      />
                    )}
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-faint">×</span>
                      <Input
                        className="w-14 text-center" type="number" min={1} max={99} value={it.quantity}
                        onChange={(e) => patchItem(it.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        className="w-24 text-end" type="number" min={0} step="0.01" dir="ltr"
                        value={it.unitPrice ? (it.unitPrice / 100).toFixed(2) : ""}
                        placeholder="0.00"
                        onChange={(e) => patchItem(it.key, { unitPrice: Math.round((Number(e.target.value) || 0) * 100) })}
                        disabled={!!it.productId}
                      />
                      <span className="text-[11px] text-faint">DH</span>
                    </div>
                    <span className="w-20 text-end text-[13px] font-semibold tnum">{money(it.quantity * it.unitPrice, { compact: true })}</span>
                    <button type="button" onClick={() => removeItem(it.key)} className="rounded-md p-1.5 text-faint transition-colors hover:bg-error-soft hover:text-error" aria-label={t("common.remove")}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* summary */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3.5 text-[13.5px] font-semibold">{t("common.total")}</h2>
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("common.subtotal")}</dt>
                <dd className="font-medium tnum">{money(itemsTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("common.shippingFee")}</dt>
                <dd className="font-medium tnum">{cityFee != null ? money(shippingFee) : "—"}</dd>
              </div>
              {cityFee != null && (
                <p className="rounded-lg bg-info-soft px-2.5 py-1.5 text-[11.5px] leading-4 text-info">
                  {t("order.new.feeHint", { city: form.city, fee: money(shippingFee) })}
                </p>
              )}
              <div className="flex justify-between border-t border-border pt-2.5">
                <dt className="font-semibold">{t("common.total")}</dt>
                <dd className="text-[15px] font-semibold tnum">{money(total)}</dd>
              </div>
            </dl>

            <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2.5">
              <div>
                <p className="text-[13px] font-medium">{t("order.new.codToggle")}</p>
                <p className="text-[11.5px] text-muted-foreground">{cod ? t("payment.COD") : t("payment.PREPAID")}</p>
              </div>
              <Switch checked={cod} onCheckedChange={setCod} aria-label={t("order.new.codToggle")} />
            </div>
            {cod && (
              <div className="mt-2.5 rounded-lg border border-success/25 bg-success-soft px-3 py-2.5">
                <p className="text-[11.5px] font-medium text-success">{t("order.new.codAmount")}</p>
                <p className="text-[18px] font-semibold text-success tnum">{money(codAmount)}</p>
              </div>
            )}

            {/* exchange order */}
            <div className="mt-2.5 flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2.5" hidden={!exchangeEnabled}>
              <div className="flex items-center gap-2">
                <RefreshCcw className="size-4 text-muted-foreground" />
                <p className="text-[13px] font-medium">{t("exchange.toggle")}</p>
              </div>
              <Switch checked={isExchange} onCheckedChange={setIsExchange} aria-label={t("exchange.toggle")} />
            </div>
            {isExchange && (
              <div className="mt-2.5">
                <Field label={t("exchange.for")} error={errors.exchangeFor}>
                  <Input value={exchangeFor} onChange={(e) => setExchangeFor(e.target.value)} placeholder="MSR-8X2K4Q" dir="ltr" className="tnum uppercase" />
                </Field>
              </div>
            )}

            {/* allow opening parcel */}
            {allowOpenParcelEnabled && (
              <div className="mt-2.5 flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <PackageCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-[13px] font-medium leading-tight">{t("order.allowOpenParcel") || "Ouvrir le colis avant paiement"}</p>
                    <p className="text-[11px] text-muted-foreground">{allowOpenParcel ? (t("order.allowOpenYes") || "Autorisé au client") : (t("order.allowOpenNo") || "Non autorisé")}</p>
                  </div>
                </div>
                <Switch checked={allowOpenParcel} onCheckedChange={setAllowOpenParcel} aria-label="Autoriser l'ouverture du colis" />
              </div>
            )}

            <Button type="submit" size="lg" className="mt-4 w-full" disabled={saving || items.length === 0}>
              {saving ? t("common.loading") : t("order.new.submit")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
