"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, ShoppingBasket, TicketPercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Product = { id: string; name: string; price: number; category: string | null };

export function StoreCatalog({
  storeName, slug, products, cities,
}: {
  storeName: string; slug: string; products: Product[]; cities: string[];
}) {
  const [selected, setSelected] = React.useState<Product | null>(null);
  const [qty, setQty] = React.useState(1);
  const [promo, setPromo] = React.useState("");
  const [form, setForm] = React.useState({ fullName: "", phone: "", city: cities[0] ?? "", address: "", notes: "" });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<{ reference: string; total: number } | null>(null);

  const subtotal = selected ? selected.price * qty : 0;
  const shipping = form.city ? 3000 : 0; // flat estimate; final fee set by dispatch
  const total = subtotal + shipping;

  async function submit() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/store/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selected.id,
          fullName: form.fullName,
          phone: form.phone,
          city: form.city,
          address: form.address,
          quantity: qty,
          notes: form.notes || undefined,
          promoCode: promo || undefined,
        }),
      });
      const j = await res.json();
      if (j.data?.ok) {
        setSuccess({ reference: j.data.reference, total: j.data.total });
      } else {
        setError(j.data?.message ?? j.error?.message ?? "Erreur");
      }
    } catch {
      setError("Erreur de connexion");
    }
    setBusy(false);
  }

  if (success) {
    return (
      <div className="mt-8 rounded-2xl border border-success/30 bg-success-soft p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-success" strokeWidth={1.6} />
        <h2 className="mt-3 text-[20px] font-bold text-success">Commande confirmée !</h2>
        <p className="mt-1 text-[14px] text-success/85">
          Merci {form.fullName.split(" ")[0]} — votre commande sera livrée à {form.city}, paiement à la livraison.
        </p>
        <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-[18px] font-bold tnum" dir="ltr">{success.reference}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">Montant à préparer : <strong>{(success.total / 100).toFixed(2)} DH</strong></p>
        <Link href={`/track?ref=${success.reference}`} className="mt-5 inline-flex h-10 items-center rounded-xl bg-success px-5 text-[13.5px] font-semibold text-white">
          Suivre ma commande
        </Link>
        <button
          onClick={() => { setSuccess(null); setSelected(null); setQty(1); }}
          className="mt-3 block w-full text-[12.5px] text-muted-foreground hover:text-foreground"
        >
          Commander autre chose
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {/* catalog */}
      <div>
        <h2 className="mb-3 text-[15px] font-semibold">Produits</h2>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => { setSelected(p); setQty(1); setError(null); }}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border p-3.5 text-start shadow-xs transition-all",
                selected?.id === p.id ? "border-primary bg-primary-soft ring-1 ring-primary/30" : "border-border bg-surface hover:border-primary/40"
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold">{p.name}</p>
                {p.category && <p className="text-[11.5px] text-faint">{p.category}</p>}
              </div>
              <span className="shrink-0 text-[14px] font-bold text-primary tnum">{(p.price / 100).toFixed(0)} DH</span>
            </button>
          ))}
        </div>
      </div>

      {/* checkout */}
      {selected && (
        <div className="rounded-2xl border border-primary/25 bg-surface p-5 shadow-sm animate-slide-up">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <ShoppingBasket className="size-4 text-primary" /> Votre commande
          </h2>

          <div className="mt-3 flex items-center justify-between rounded-xl bg-primary-soft px-3.5 py-2.5">
            <p className="text-[13px] font-semibold text-primary">{selected.name}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="size-7 rounded-lg border border-primary/30 font-bold text-primary">−</button>
              <span className="w-6 text-center font-semibold tnum">{qty}</span>
              <button onClick={() => setQty(Math.min(10, qty + 1))} className="size-7 rounded-lg border border-primary/30 font-bold text-primary">+</button>
              <span className="ms-2 w-20 text-end text-[15px] font-bold text-primary tnum">{((selected.price * qty) / 100).toFixed(2)} DH</span>
            </div>
          </div>

          <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
            <Field label="Nom complet">
              <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Nom et prénom" />
            </Field>
            <Field label="Téléphone" hint="06 12 34 56 78">
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0612345678" inputMode="tel" dir="ltr" />
            </Field>
            <Field label="Ville">
              <Select value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Adresse">
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Rue, quartier…" />
            </Field>
            <Field label="Code promo (facultatif)" className="sm:col-span-2">
              <div className="flex gap-2">
                <Input value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} placeholder="PROMO10" dir="ltr" className="uppercase" />
                <span className="inline-flex items-center rounded-lg border border-border px-3 text-faint"><TicketPercent className="size-4" /></span>
              </div>
            </Field>
            <Field label="Note (facultatif)" className="sm:col-span-2">
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </Field>
          </div>

          <dl className="mt-4 space-y-1.5 rounded-xl border border-border bg-surface-2 p-3.5 text-[13px]">
            <div className="flex justify-between"><dt className="text-muted-foreground">Produit</dt><dd className="tnum">{(subtotal / 100).toFixed(2)} DH</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Livraison (estimée)</dt><dd className="tnum">{(shipping / 100).toFixed(2)} DH</dd></div>
            <div className="flex justify-between border-t border-border pt-2 text-[15px] font-bold"><dt>Paiement à la livraison</dt><dd className="tnum">{(total / 100).toFixed(2)} DH</dd></div>
          </dl>

          {error && <p className="mt-2.5 rounded-lg bg-error-soft px-3 py-2 text-[12.5px] font-medium text-error">{error}</p>}

          <Button size="lg" className="mt-4 w-full text-[15px]" disabled={busy} onClick={submit}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Commander — payer à la livraison
          </Button>
        </div>
      )}
    </div>
  );
}
