import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { PageHeader, EmptyState } from "@/components/shared";
import { Badge, type Tone } from "@/components/ui/badge";

export const metadata = { title: "Notification log" };

const CHANNEL_TONES: Record<string, Tone> = {
  WHATSAPP: "success",
  EMAIL: "info",
  SMS: "warning",
  IN_APP: "neutral",
};

export default async function AdminNotificationsPage() {
  const i = await getI18n();
  const notifications = await db.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <>
      <PageHeader title={i.t("admin.notifications.title")} subtitle={i.t("admin.notifications.subtitle")} />
      <div className="rounded-xl border border-border bg-surface shadow-xs">
        {notifications.length === 0 ? (
          <EmptyState icon="Bell" title={i.t("common.noResults")} />
        ) : (
          <ul className="divide-y divide-border/70">
            {notifications.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center gap-2.5 px-4 py-2.5">
                <Badge tone={CHANNEL_TONES[n.channel] ?? "neutral"} dot>{i.t(`channel.${n.channel}`)}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{n.title}</p>
                  {n.body && <p className="truncate text-[12px] text-muted-foreground">{n.body}</p>}
                </div>
                <span className="text-[11px] text-faint">{i.rel(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
