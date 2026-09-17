"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Users } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Avatar } from "@/components/ui/misc";
import { EmptyState } from "@/components/shared";
import { avatarHue } from "@/lib/format";

export type CustomerRow = {
  id: string; fullName: string; phone: string; city: string;
  totalOrders: number; totalSpent: number; failedCount: number; returnedCount: number;
};

export function CustomersTable({ rows, q }: { rows: CustomerRow[]; q: string }) {
  const { t, money, num, phone: fmtPhone } = useI18n();
  const router = useRouter();
  const [search, setSearch] = React.useState(q);

  return (
    <>
      <form
        className="relative mb-3 max-w-xs"
        onSubmit={(e) => { e.preventDefault(); router.push(`/app/customers?q=${encodeURIComponent(search)}`); }}
      >
        <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("customers.searchPlaceholder")} className="ps-8" />
      </form>

      <div className="rounded-xl border border-border bg-surface shadow-xs">
        {rows.length === 0 ? (
          <EmptyState icon={Users} title={t("common.noResults")} />
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>{t("common.name")}</TH>
                <TH className="hidden md:table-cell">{t("common.phone")}</TH>
                <TH>{t("common.city")}</TH>
                <TH className="text-end">{t("customers.table.orders")}</TH>
                <TH className="text-end">{t("customers.table.spent")}</TH>
                <TH className="hidden text-end sm:table-cell">✓ / ✕</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link href={`/app/customers/${c.id}`} className="flex items-center gap-2 font-medium hover:text-primary hover:underline">
                      <Avatar name={c.fullName} size={26} hue={avatarHue(c.fullName)} />
                      {c.fullName}
                    </Link>
                  </TD>
                  <TD className="hidden text-muted-foreground tnum md:table-cell" dir="ltr">{fmtPhone(c.phone)}</TD>
                  <TD>{c.city}</TD>
                  <TD className="text-end tnum">{num(c.totalOrders)}</TD>
                  <TD className="text-end font-semibold tnum">{money(c.totalSpent)}</TD>
                  <TD className="hidden text-end sm:table-cell">
                    <span className="text-[12px] text-muted-foreground tnum">
                      <span className="text-success">{num(c.totalOrders - c.failedCount - c.returnedCount)}</span>
                      {" / "}
                      <span className={c.failedCount ? "text-error" : ""}>{num(c.failedCount)}</span>
                      {c.returnedCount ? <> / <span className="text-violet">{num(c.returnedCount)}</span></> : null}
                    </span>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </>
  );
}
