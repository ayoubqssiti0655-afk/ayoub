import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { PageHeader, EmptyState, Pagination } from "@/components/shared";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ScrollText } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Audit logs" };

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const i = await getI18n();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const per = 30;

  const [total, logs] = await Promise.all([
    db.auditLog.count(),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * per, take: per }),
  ]);

  return (
    <>
      <PageHeader title={i.t("admin.audit.title")} subtitle={i.t("admin.audit.subtitle")} />
      <div className="rounded-xl border border-border bg-surface shadow-xs">
        {logs.length === 0 ? (
          <EmptyState icon="ScrollText" title={i.t("common.noResults")} />
        ) : (
          <>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>{i.t("common.date")}</TH>
                  <TH>{i.t("admin.audit.actor")}</TH>
                  <TH>{i.t("admin.audit.action")}</TH>
                  <TH>{i.t("admin.audit.entity")}</TH>
                  <TH className="hidden md:table-cell">{i.t("admin.audit.meta")}</TH>
                </TR>
              </THead>
              <TBody>
                {logs.map((l) => (
                  <TR key={l.id}>
                    <TD className="text-muted-foreground tnum">{i.dateTime(l.createdAt)}</TD>
                    <TD className="font-medium">{l.actorName}</TD>
                    <TD>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{l.action}</span>
                    </TD>
                    <TD className="text-muted-foreground">
                      {l.entity}{l.entityId ? <span className="ms-1 font-mono text-[11px] text-faint">{l.entityId.slice(0, 8)}…</span> : null}
                    </TD>
                    <TD className="hidden max-w-64 truncate text-muted-foreground md:table-cell">{l.meta ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="border-t border-border">
              <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / per))} total={total} per={per} basePath="/admin/audit" params={{}} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
