import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { StatCard, PageHeader } from "@/components/shared";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { MerchantAdminActions } from "@/components/admin/merchant-detail-actions";
import { buttonVariants } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { avatarHue } from "@/lib/format";
import { ACTIVE_STATUSES } from "@/lib/constants";

export default async function AdminMerchantDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const i = await getI18n();

  const merchant = await db.merchant.findUnique({
    where: { id },
    include: {
      staff: { include: { user: { select: { name: true, email: true } } } },
      _count: { select: { orders: true, products: true, customers: true } },
    },
  });
  if (!merchant) notFound();

  const [delivered, failed, returned, wallet, cycleChosenSetting] = await Promise.all([
    db.order.count({ where: { merchantId: id, status: "DELIVERED" } }),
    db.order.count({ where: { merchantId: id, status: "FAILED" } }),
    db.order.count({ where: { merchantId: id, status: "RETURNED" } }),
    db.codTransaction.aggregate({ where: { merchantId: id, status: "AVAILABLE" }, _sum: { amount: true } }),
    db.setting.findUnique({ where: { key: `merchant_cycle_chosen_${id}` } }),
  ]);

  const owner = merchant.staff.find((s) => s.staffRole === "OWNER")?.user;

  return (
    <>
      <div className="mb-4">
        <Link href="/admin/merchants" className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-3.5 rtl:rotate-180" /> {i.t("admin.merchants.title")}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={merchant.name} size={44} hue={avatarHue(merchant.name)} />
            <div>
              <h1 className="text-[19px] font-semibold tracking-[-0.02em]">{merchant.name}</h1>
              <p className="text-[13px] text-muted-foreground">{merchant.email} · {merchant.city}</p>
            </div>
            <StatusBadge status={merchant.status} />
          </div>
          <MerchantAdminActions
            id={merchant.id}
            status={merchant.status}
            settlementCycle={merchant.settlementCycle}
            cycleChosen={cycleChosenSetting?.value === "true"}
            plan={merchant.plan}
            wallet={wallet._sum.amount ?? 0}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={i.t("nav.orders")} value={i.num(merchant._count.orders)} />
        <StatCard label={i.t("status.DELIVERED")} value={i.num(delivered)} accent="var(--success)" />
        <StatCard label={i.t("status.FAILED")} value={i.num(failed)} accent="var(--error)" />
        <StatCard label={i.t("status.RETURNED")} value={i.num(returned)} accent="var(--chart-4)" />
        <StatCard label={i.t("wallet.available")} value={i.money(wallet._sum.amount ?? 0, { compact: true })} accent="var(--chart-5)" />
        <StatCard label={i.t("nav.products")} value={i.num(merchant._count.products)} />
        <StatCard label={i.t("nav.customers")} value={i.num(merchant._count.customers)} />
        <StatCard label={i.t("common.plan")} value={i.t(`plan.${merchant.plan}`)} accent="var(--info)" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 text-[13.5px] font-semibold">{i.t("admin.merchants.owner")}</h2>
            {owner ? (
              <div className="flex items-center gap-2.5">
                <Avatar name={owner.name} size={36} hue={avatarHue(owner.name)} />
                <div>
                  <p className="text-[13.5px] font-semibold">{owner.name}</p>
                  <p className="text-[12px] text-muted-foreground">{owner.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">—</p>
            )}
            <p className="mt-3 text-[12.5px] text-muted-foreground">{merchant.address}</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground tnum" dir="ltr">{merchant.phone}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 text-[13.5px] font-semibold">{i.t("admin.merchants.financials")}</h2>
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{i.t("settings.settlementCycle")}</dt>
                <dd className="font-medium">{i.t(`cycle.${merchant.settlementCycle}`)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{i.t("wallet.available")}</dt>
                <dd className="font-medium tnum">{i.money(wallet._sum.amount ?? 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{i.t("nav.payments")}</dt>
                <dd><Link href="/admin/settlements" className="font-medium text-primary hover:underline">{i.t("wallet.settlements")}</Link></dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
