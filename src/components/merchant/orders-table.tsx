"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Wand2, ArrowUpDown, CheckCheck, ChevronDown, Columns3, Download, EyeOff, Filter, PackageCheck,
  Search, ShoppingCart, Truck, X, Ban, FileSpreadsheet, Printer, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";
import { ORDER_STATUSES } from "@/lib/constants";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Checkbox, Avatar, Popover, PopoverContent, PopoverTrigger, Separator } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input, Select, Label } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, Pagination } from "@/components/shared";
import { useToast } from "@/components/ui/toast";
import { confirmOrdersAction, markReadyAction, exportOrdersAction } from "@/server/actions";
import { avatarHue, waLink } from "@/lib/format";
import { ImportOrdersModal } from "./import-orders-modal";

export type OrderRow = {
  id: string;
  reference: string;
  status: string;
  total: number;
  codAmount: number;
  deliveryCity: string;
  source: string;
  createdAt: string;
  customer: { fullName: string; phone: string };
  courierName?: string | null;
  courierId?: string | null;
};

const DEFAULT_COLUMNS = ["customer", "phone", "city", "amount", "cod", "status", "courier", "created", "source"];

export function OrdersTable({
  rows,
  total,
  page,
  per,
  totalPages,
  cities,
  couriers,
  basePath = "/app/orders",
  autoAssignEnabled = true,
}: {
  rows: OrderRow[];
  total: number;
  page: number;
  per: number;
  totalPages: number;
  cities: string[];
  couriers: { id: string; name: string }[];
  basePath?: string;
  autoAssignEnabled?: boolean;
}) {
  const { t, money, date, phone: fmtPhone } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [hiddenCols, setHiddenCols] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState(sp.get("q") ?? "");
  const [pending, setPending] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("masar_order_cols");
      if (saved) setHiddenCols(JSON.parse(saved));
    } catch {}
  }, []);

  const activeFilterCount = ["status", "city", "courier", "from", "to"].filter((k) => sp.get(k) && sp.get(k) !== "ALL").length;

  function pushParams(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (!v || v === "ALL") params.delete(k);
      else params.set(k, v);
    }
    if (!("page" in patch)) params.delete("page");
    router.push(`${basePath}?${params.toString()}`);
  }

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulk(kind: "confirm" | "ready" | "export" | "auto") {
    const ids = [...selected];
    if (!ids.length) return;
    setPending(true);
    if (kind === "export") {
      const res = await exportOrdersAction(ids);
      if (res.ok && res.data?.csv) {
        const blob = new Blob([`\ufeff${res.data.csv}`], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `masar-orders-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
      }
    } else if (kind === "auto") {
      const res = await fetch("/api/v1/orders/auto-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: ids }),
      });
      const j = await res.json().catch(() => null);
      const assigned = j?.data?.assigned ?? 0;
      const failed = j?.data?.failed ?? ids.length;
      toast.push({ title: assigned ? t("autoAssign.done", { count: assigned }) : t("autoAssign.failed", { count: failed }), variant: assigned ? "success" : "error" });
      setSelected(new Set());
      router.refresh();
      setPending(false);
      return;
    } else {
      const res = kind === "confirm" ? await confirmOrdersAction(ids) : await markReadyAction(ids);
      toast.push({ title: res.ok ? t("settings.saved") : res.message ?? t("common.errorTitle"), variant: res.ok ? "success" : "error" });
      if (res.ok) setSelected(new Set());
      router.refresh();
    }
    setPending(false);
  }

  const visible = (c: string) => !hiddenCols.includes(c);
  function toggleCol(c: string) {
    setHiddenCols((prev) => {
      const next = prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c];
      localStorage.setItem("masar_order_cols", JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface shadow-xs">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <form
          className="relative min-w-52 flex-1 sm:max-w-xs"
          onSubmit={(e) => { e.preventDefault(); pushParams({ q: search || undefined }); }}
        >
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("orders.searchPlaceholder")}
            className="ps-8"
          />
        </form>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="size-3.5" />
              {t("common.filters")}
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground tnum">{activeFilterCount}</span>
              )}
              <ChevronDown className="size-3 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3.5" align="start">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("orders.filterStatus")}</Label>
                <Select value={sp.get("status") ?? "ALL"} onChange={(e) => pushParams({ status: e.target.value })}>
                  <option value="ALL">{t("common.all")}</option>
                  {ORDER_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("orders.filterCity")}</Label>
                <Select value={sp.get("city") ?? "ALL"} onChange={(e) => pushParams({ city: e.target.value })}>
                  <option value="ALL">{t("common.all")}</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("orders.filterCourier")}</Label>
                <Select value={sp.get("courier") ?? "ALL"} onChange={(e) => pushParams({ courier: e.target.value })}>
                  <option value="ALL">{t("common.all")}</option>
                  {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>{t("common.from")}</Label>
                  <Input type="date" value={sp.get("from") ?? ""} onChange={(e) => pushParams({ from: e.target.value || undefined })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("common.to")}</Label>
                  <Input type="date" value={sp.get("to") ?? ""} onChange={(e) => pushParams({ to: e.target.value || undefined })} />
                </div>
              </div>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => router.push(basePath)}>
                  <X className="size-3.5" /> {t("common.clear")}
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Select value={sp.get("sort") ?? "newest"} onChange={(e) => pushParams({ sort: e.target.value })} className="w-36">
          <option value="newest">{t("common.date")} ↓</option>
          <option value="oldest">{t("common.date")} ↑</option>
          <option value="amount_desc">{t("common.amount")} ↓</option>
          <option value="amount_asc">{t("common.amount")} ↑</option>
          <option value="status">{t("common.status")}</option>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="iconSm" aria-label={t("common.columns")}>
              <Columns3 className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1.5">
            {DEFAULT_COLUMNS.map((c) => (
              <button
                key={c}
                onClick={() => toggleCol(c)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] hover:bg-muted"
              >
                <span className={cn("flex size-3.5 items-center justify-center rounded-[4px] border", visible(c) ? "border-primary bg-primary text-primary-foreground" : "border-border-strong")}>
                  {visible(c) && <svg viewBox="0 0 10 10" className="size-2.5"><path d="M1.5 5.5 4 8l4.5-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>}
                </span>
                {t(`orders.table.${c}`)}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const params = new URLSearchParams(sp.toString());
            window.location.href = `/api/v1/export/orders?${params.toString()}`;
          }}
        >
          <Download className="size-3.5" />
          <span className="hidden sm:inline">{t("common.exportCsv")}</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setImportOpen(true)}
          className="border-primary/30 text-primary hover:bg-primary-soft"
        >
          <FileSpreadsheet className="size-3.5" />
          <span>{t("orders.importExcel")}</span>
        </Button>
      </div>

      {/* bulk bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-primary-soft px-3 py-2 animate-slide-up">
          <span className="text-[12.5px] font-semibold text-primary tnum">{t("orders.selected", { count: selected.size })}</span>
          <Separator orientation="vertical" className="h-4" />
          <Button size="sm" variant="outline" disabled={pending} onClick={() => bulk("confirm")}>
            <CheckCheck className="size-3.5" /> {t("orders.bulkConfirm")}
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => bulk("ready")}>
            <PackageCheck className="size-3.5" /> {t("orders.bulkReady")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              const ids = Array.from(selected).join(",");
              window.open(`/app/orders/bulk-labels?ids=${ids}`, "_blank");
            }}
          >
            <Printer className="size-3.5" /> {t("orders.printLabels")}
          </Button>
          {autoAssignEnabled && (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => bulk("auto")} title={t("autoAssign.hint")}>
              <Wand2 className="size-3.5" /> {t("autoAssign.button")}
            </Button>
          )}
          <Button size="sm" variant="outline" disabled={pending} onClick={() => bulk("export")}>
            <Download className="size-3.5" /> {t("orders.bulkExport")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            <X className="size-3.5" /> {t("common.cancel")}
          </Button>
        </div>
      )}

      {/* table */}
      {rows.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={t("orders.empty")}
          description={t("orders.emptyDesc")}
          action={<Link href="/app/orders/new" className="inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-[13px] font-medium text-primary-foreground shadow-xs hover:bg-primary-hover">{t("orders.newOrder")}</Link>}
        />
      ) : (
        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH className="w-9 ps-4">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
              </TH>
              <TH>{t("orders.table.ref")}</TH>
              {visible("customer") && <TH>{t("orders.table.customer")}</TH>}
              {visible("phone") && <TH className="hidden md:table-cell">{t("common.phone")}</TH>}
              {visible("city") && <TH>{t("orders.table.city")}</TH>}
              {visible("amount") && <TH className="text-end">{t("orders.table.amount")}</TH>}
              {visible("cod") && <TH className="hidden text-end sm:table-cell">{t("orders.table.cod")}</TH>}
              {visible("status") && <TH>{t("orders.table.status")}</TH>}
              {visible("courier") && <TH className="hidden lg:table-cell">{t("orders.table.courier")}</TH>}
              {visible("created") && <TH className="hidden xl:table-cell">{t("orders.table.created")}</TH>}
              {visible("source") && <TH className="hidden xl:table-cell">{t("orders.table.source")}</TH>}
            </TR>
          </THead>
          <TBody>
            {rows.map((o) => (
              <TR key={o.id} className="group">
                <TD className="ps-4">
                  <Checkbox checked={selected.has(o.id)} onCheckedChange={() => toggle(o.id)} aria-label={`Select ${o.reference}`} />
                </TD>
                <TD>
                  <Link href={`/app/orders/${o.id}`} className="font-semibold text-foreground tnum hover:text-primary hover:underline">
                    {o.reference}
                  </Link>
                </TD>
                {visible("customer") && (
                  <TD>
                    <div className="flex items-center gap-2">
                      <Avatar name={o.customer.fullName} size={24} hue={avatarHue(o.customer.fullName)} />
                      <span className="font-medium">{o.customer.fullName}</span>
                    </div>
                  </TD>
                )}
                {visible("phone") && (
                  <TD className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-muted-foreground tnum">
                      <span>{fmtPhone(o.customer.phone)}</span>
                      <a
                        href={waLink(
                          o.customer.phone,
                          t("whatsapp.merchantMessage", {
                            name: o.customer.fullName,
                            merchant: "المتجر",
                            ref: o.reference,
                            cod: money(o.codAmount),
                          })
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="flex size-5.5 items-center justify-center rounded-md border border-border bg-surface text-[#25D366] transition-colors hover:border-[#25D366]/40 hover:bg-[#25D366]/10"
                        title={t("whatsapp.quickAction")}
                      >
                        <MessageCircle className="size-3" />
                      </a>
                    </div>
                  </TD>
                )}
                {visible("city") && <TD>{o.deliveryCity}</TD>}
                {visible("amount") && <TD className="text-end font-semibold tnum">{money(o.total)}</TD>}
                {visible("cod") && <TD className="hidden text-end text-muted-foreground tnum sm:table-cell">{o.codAmount > 0 ? money(o.codAmount) : "—"}</TD>}
                {visible("status") && <TD><StatusBadge status={o.status} /></TD>}
                {visible("courier") && (
                  <TD className="hidden lg:table-cell">
                    {o.courierName ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Avatar name={o.courierName} size={20} hue={avatarHue(o.courierName)} />
                        <span className="text-[12.5px]">{o.courierName}</span>
                      </span>
                    ) : (
                      <span className="text-[12.5px] text-faint">{t("common.unassigned")}</span>
                    )}
                  </TD>
                )}
                {visible("created") && <TD className="hidden text-muted-foreground tnum xl:table-cell">{date(o.createdAt)}</TD>}
                {visible("source") && (
                  <TD className="hidden xl:table-cell">
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{t(`source.${o.source}`)}</span>
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {rows.length > 0 && (
        <div className="border-t border-border">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            per={per}
            basePath={basePath}
            params={Object.fromEntries(sp.entries())}
          />
        </div>
      )}

      <ImportOrdersModal
        open={importOpen}
        onOpenChange={setImportOpen}
        cities={cities}
      />
    </div>
  );
}
