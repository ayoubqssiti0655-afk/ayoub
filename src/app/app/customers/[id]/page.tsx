import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getMerchantContext } from "@/lib/auth";
import { getI18n } from "@/i18n/server";
import { PageHeader, EmptyState } from "@/components/shared";
import { StatusBadge } from "@/components/status-badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Avatar } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { avatarHue, waLink } from "@/lib/format";
import { ChevronLeft, Phone, MessageCircle } from "lucide-react";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getMerchantContext();
  if (!ctx) return null;
  const i = await getI18n();

  const customer = await db.customer.findFirst({ where: { id, merchantId: ctx.merchant.id } });
  if (!customer) notFound();

  const orders = await db.order.findMany({
    where: { customerId: id },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const delivered = orders.filter((o) => o.status === "DELIVERED").length;
  const failed = orders.filter((o) => o.status === "FAILED").length;
  const returned = orders.filter((o) => o.status === "RETURNED").length;

  const stats = [
    { label: i.t("customers.table.orders"), value: String(customer.totalOrders) },
    { label: i.t("customers.totalSpent"), value: i.money(customer.totalSpent) },
    { label: i.t("customers.deliveredRate"), value: `${delivered} ✓ / ${failed} ✕ / ${returned} ↩` },
  ];

  return (
    <>
      <div className="mb-4">
        <Link href="/app/customers" className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-3.5 rtl:rotate-180" /> {i.t("customers.title")}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={customer.fullName} size={44} hue={avatarHue(customer.fullName)} />
            <div>
              <h1 className="text-[19px] font-semibold tracking-[-0.02em]">{customer.fullName}</h1>
              <p className="text-[13px] text-muted-foreground tnum" dir="ltr">{i.phone(customer.phone)} · {customer.city}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a href={`tel:${customer.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 text-[13px] font-medium shadow-xs hover:bg-muted">
              <Phone className="size-3.5" /> {i.t("common.call")}
            </a>
            <a href={waLink(customer.phone)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 text-[13px] font-medium shadow-xs hover:bg-muted">
              <MessageCircle className="size-3.5" /> WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-4 shadow-xs">
            <p className="text-[12px] text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-[18px] font-semibold tnum">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardContent className="p-0">
            <h2 className="border-b border-border px-4 py-3 text-[13.5px] font-semibold">{i.t("customers.orderHistory")}</h2>
            {orders.length === 0 ? (
              <EmptyState title={i.t("customers.noOrders")} />
            ) : (
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>{i.t("orders.table.ref")}</TH>
                    <TH>{i.t("common.status")}</TH>
                    <TH className="text-end">{i.t("common.total")}</TH>
                    <TH className="hidden text-end sm:table-cell">{i.t("common.date")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {orders.map((o) => (
                    <TR key={o.id}>
                      <TD>
                        <Link href={`/app/orders/${o.id}`} className="font-semibold tnum hover:text-primary hover:underline">{o.reference}</Link>
                      </TD>
                      <TD><StatusBadge status={o.status} size="sm" /></TD>
                      <TD className="text-end font-medium tnum">{i.money(o.total)}</TD>
                      <TD className="hidden text-end text-muted-foreground tnum sm:table-cell">{i.date(o.createdAt)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <h2 className="mb-2.5 text-[13.5px] font-semibold">{i.t("common.address")}</h2>
              <p className="text-[13px] leading-5 text-muted-foreground">{customer.address ?? "—"}</p>
              {customer.secondaryPhone && (
                <p className="mt-2 text-[12.5px] text-muted-foreground tnum" dir="ltr">{i.phone(customer.secondaryPhone)}</p>
              )}
              {customer.notes && <p className="mt-3 rounded-lg bg-warning-soft px-2.5 py-1.5 text-[12px] leading-5 text-warning">{customer.notes}</p>}
            </CardContent>
          </Card>
          {customer.totalOrders > 1 && (
            <div className="rounded-xl border border-primary/25 bg-primary-soft p-4">
              <p className="text-[12px] font-medium text-primary">{i.t("customers.repeatRate")}</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">{customer.totalOrders} × {i.t("customers.table.orders").toLowerCase()}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
