import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { PageHeader, EmptyState } from "@/components/shared";
import { StatusBadge } from "@/components/status-badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { RotateCcw, Scale } from "lucide-react";
import { DisputesTable, type DisputeRow } from "@/components/admin/disputes-table";
import { getFeatureMap } from "@/server/features";
import Link from "next/link";

export const metadata = { title: "Returns" };

export default async function AdminReturnsPage() {
  const i = await getI18n();
  const features = await getFeatureMap();
  const [returns, disputes] = await Promise.all([
    db.return.findMany({
    include: {
      order: { include: { customer: { select: { fullName: true } } } },
      courier: { include: { user: { select: { name: true } } } },
    },
      orderBy: { requestedAt: "desc" },
      take: 100,
    }),
    features.disputes
      ? db.dispute.findMany({ include: { order: { select: { reference: true } } }, orderBy: { openedAt: "desc" }, take: 30 })
      : Promise.resolve([]),
  ]);

  const merchantNames = new Map((await db.merchant.findMany({ select: { id: true, name: true } })).map((m) => [m.id, m.name]));
  return (
    <>
      <PageHeader title={i.t("returns.title")} subtitle={i.t("returns.subtitle", { count: i.num(returns.length) })} />
      {disputes.length > 0 && (
        <div className="mb-4">
          <DisputesTable disputes={disputes.map((d) => ({
            id: d.id, reference: d.order.reference, merchantName: merchantNames.get(d.merchantId) ?? "—", type: d.type,
            status: d.status, description: d.description, openedAt: d.openedAt.toISOString(),
          })) as DisputeRow[]} />
        </div>
      )}
      <div className="rounded-xl border border-border bg-surface shadow-xs">
        {returns.length === 0 ? (
          <EmptyState icon="RotateCcw" title={i.t("returns.empty")} />
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>{i.t("deliveries.table.order")}</TH>
                <TH>{i.t("orders.table.customer")}</TH>
                <TH>{i.t("returns.table.reason")}</TH>
                <TH className="hidden md:table-cell">{i.t("common.courier")}</TH>
                <TH className="hidden sm:table-cell">{i.t("returns.table.date")}</TH>
                <TH>{i.t("common.status")}</TH>
              </TR>
            </THead>
            <TBody>
              {returns.map((r) => (
                <TR key={r.id}>
                  <TD>
                    <Link href={`/admin/orders/${r.orderId}`} className="font-semibold tnum hover:text-primary hover:underline">{r.order.reference}</Link>
                  </TD>
                  <TD className="font-medium">{r.order.customer.fullName}</TD>
                  <TD className="max-w-56 truncate text-muted-foreground">{r.reason}</TD>
                  <TD className="hidden text-muted-foreground md:table-cell">{r.courier?.user.name ?? i.t("common.unassigned")}</TD>
                  <TD className="hidden text-muted-foreground tnum sm:table-cell">{i.date(r.requestedAt)}</TD>
                  <TD><StatusBadge status={r.status} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </>
  );
}
