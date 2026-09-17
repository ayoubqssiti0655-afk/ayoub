"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Package, Pencil, Search, Trash2, Upload } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input, Select, Label, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared";
import { useToast } from "@/components/ui/toast";
import { saveProductAction, deleteProductAction, importProductsAction } from "@/server/actions";

export type ProductRow = {
  id: string; name: string; sku: string | null; category: string | null;
  price: number; stock: number; sold: number; isActive: boolean;
};

export function ProductsClient({ products }: { products: ProductRow[] }) {
  const { t, money, num } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState("ALL");
  const [editing, setEditing] = React.useState<ProductRow | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [csv, setCsv] = React.useState("");

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];
  const filtered = products.filter((p) =>
    (category === "ALL" || p.category === category) &&
    (!q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(q.toLowerCase()))
  );

  const open = creating || editing;
  const current = editing;

  async function onSave(form: FormData) {
    const payload = {
      name: String(form.get("name") ?? ""),
      sku: String(form.get("sku") ?? ""),
      category: String(form.get("category") ?? ""),
      price: Math.round(Number(form.get("price") ?? 0) * 100),
      stock: Number(form.get("stock") ?? 0),
      imageUrl: String(form.get("imageUrl") ?? ""),
    };
    const res = await saveProductAction(current?.id ?? null, payload);
    toast.push({ title: res.ok ? t("settings.saved") : res.message ?? t("common.errorTitle"), variant: res.ok ? "success" : "error" });
    if (res.ok) { setCreating(false); setEditing(null); router.refresh(); }
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("products.searchPlaceholder")} className="ps-8" />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-44">
          <option value="ALL">{t("common.category")} : {t("common.all")}</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <div className="ms-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="size-3.5" /> {t("common.import")}
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setCreating(true); }}>
            <Plus /> {t("products.new")}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-xs">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t("products.empty")}
            description={t("products.emptyDesc")}
            action={<Button onClick={() => setCreating(true)}>{t("products.new")}</Button>}
          />
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>{t("products.table.name")}</TH>
                <TH className="hidden md:table-cell">{t("common.sku")}</TH>
                <TH className="hidden lg:table-cell">{t("common.category")}</TH>
                <TH className="text-end">{t("common.price")}</TH>
                <TH className="text-end">{t("common.stock")}</TH>
                <TH className="hidden text-end sm:table-cell">{t("products.table.sold")}</TH>
                <TH className="w-10" />
              </TR>
            </THead>
            <TBody>
              {filtered.map((p) => (
                <TR key={p.id}>
                  <TD className="font-medium">{p.name}</TD>
                  <TD className="hidden text-muted-foreground tnum md:table-cell">{p.sku ?? "—"}</TD>
                  <TD className="hidden lg:table-cell">
                    {p.category ? <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11.5px] text-muted-foreground">{p.category}</span> : "—"}
                  </TD>
                  <TD className="text-end font-semibold tnum">{money(p.price)}</TD>
                  <TD className="text-end">
                    {p.stock === 0 ? (
                      <Badge tone="error">{t("products.outOfStock")}</Badge>
                    ) : p.stock < 30 ? (
                      <Badge tone="warning" className="tnum">{num(p.stock)} · {t("products.lowStock")}</Badge>
                    ) : (
                      <Badge tone="success" className="tnum">{num(p.stock)}</Badge>
                    )}
                  </TD>
                  <TD className="hidden text-end text-muted-foreground tnum sm:table-cell">{num(p.sold)}</TD>
                  <TD>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="iconSm" aria-label={t("common.actions")}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditing(p); }}>
                          <Pencil /> {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          destructive
                          onClick={async () => {
                            if (!confirm(t("products.deleteConfirm"))) return;
                            const res = await deleteProductAction(p.id);
                            if (res.ok) router.refresh();
                          }}
                        >
                          <Trash2 /> {t("common.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      {/* create/edit dialog */}
      <Dialog open={!!open} onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}>
        <DialogContent size="sm">
          <DialogTitle>{current ? t("products.dialogEdit") : t("products.dialogNew")}</DialogTitle>
          <DialogDescription />
          <form
            action={onSave}
            className="mt-3 grid gap-3"
          >
            <Field label={t("common.name")}>
              <Input name="name" defaultValue={current?.name} required minLength={2} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("common.sku")}>
                <Input name="sku" defaultValue={current?.sku ?? ""} />
              </Field>
              <Field label={t("common.category")}>
                <Input name="category" defaultValue={current?.category ?? ""} list="masar-categories" />
              </Field>
            </div>
            <datalist id="masar-categories">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`${t("common.price")} (DH)`}>
                <Input name="price" type="number" min={1} step="0.01" dir="ltr"
                  defaultValue={current ? (current.price / 100).toFixed(2) : ""} required />
              </Field>
              <Field label={t("common.stock")}>
                <Input name="stock" type="number" min={0} dir="ltr" defaultValue={current?.stock ?? 0} required />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => { setCreating(false); setEditing(null); }}>{t("common.cancel")}</Button>
              <Button type="submit">{t("common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent size="sm">
          <DialogTitle>{t("common.import")} CSV</DialogTitle>
          <DialogDescription>{t("products.importDesc")}</DialogDescription>
          <textarea
            className="mt-3 min-h-40 w-full rounded-lg border border-border bg-input p-3 font-mono text-[12px]"
            placeholder={"name;sku;category;price;stock\nHuile d'argan;ATL-001;Cosmétiques;120.00;100"}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            dir="ltr"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>{t("common.cancel")}</Button>
            <Button
              onClick={async () => {
                const res = await importProductsAction(csv);
                toast.push({ title: res.ok ? t("products.imported", { count: res.data?.count ?? 0 }) : res.message ?? t("common.errorTitle"), variant: res.ok ? "success" : "error" });
                if (res.ok) { setImportOpen(false); setCsv(""); router.refresh(); }
              }}
            >
              {t("common.import")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Plus() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}
