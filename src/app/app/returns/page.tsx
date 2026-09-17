import { getMerchantContext } from "@/lib/auth";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { PageHeader, EmptyState } from "@/components/shared";
import { StatusBadge } from "@/components/status-badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { RotateCcw } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Returns" };

export default async function ReturnsPage() {
  const ctx = await getMerchantContext();
  if (!ctx) return null;
  const i = await getI18n();

  const returns = await db.return.findMany({
    where: { merchantId: ctx.merchant.id },
    include: {
      order: { include: { customer: { select: { fullName: true } } } },
      courier: { include: { user: { select: { name: true } } } },
    },
    orderBy: { requestedAt: "desc" },
    take: 100,
  });

  return (
    <>
      <PageHeader title={i.t("returns.title")} subtitle={i.t("returns.subtitle", { count: i.num(returns.length) })} />
      <div className="rounded-xl border border-border bg-surface shadow-xs">
        {returns.length === 0 ? (
          <EmptyState icon="RotateCcw" title={i.t("returns.empty")} description={i.t("returns.emptyDesc")} />
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
                    <Link href={`/app/orders/${r.orderId}`} className="font-semibold tnum hover:text-primary hover:underline">
                      {r.order.reference}
                    </Link>
                  </TD>
                  <TD className="font-medium">{r.order.customer.fullName}</TD>
                  <TD className="max-w-52 truncate text-muted-foreground" title={r.reason}>{r.reason}</TD>
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
