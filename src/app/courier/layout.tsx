import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { getFeatureMap } from "@/server/features";
import { CourierNav, LocaleSwitch } from "@/components/courier/courier-nav";
import { CourierLocationSharer } from "@/components/courier/courier-location";
import { CourierPwa } from "@/components/courier/courier-pwa";
import { Logo } from "@/components/logo";
import { Avatar } from "@/components/ui/misc";
import { Globe, Store } from "lucide-react";
import Link from "next/link";

export default async function CourierLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user?.courierProfile) redirect("/login");
  const courier = user.courierProfile;
  const i = await getI18n();

  const features = await getFeatureMap();
  const [todayActive, unread] = await Promise.all([
    db.delivery.count({ where: { courierId: courier.id, status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"] } } }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  const today = new Date();
  const dateLabel = new Intl.DateTimeFormat(i.locale === "ar" ? "ar-MA" : i.locale === "en" ? "en-GB" : "fr-MA", {
    weekday: "long", day: "numeric", month: "long",
  }).format(today);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto min-h-dvh w-full max-w-md border-x border-border bg-surface pb-20 shadow-xs lg:my-0">
        {/* compact header */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2.5 border-b border-border bg-surface/90 px-4 backdrop-blur-md">
          <Logo mark />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[12px] font-medium text-muted-foreground">{dateLabel}</p>
          </div>
          {user.staffProfile && (
            <Link
              href="/app"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-[12px] font-medium text-foreground shadow-xs hover:bg-muted transition-colors shrink-0"
              title={i.locale === "ar" ? "لوحة المتجر" : "Espace Marchand"}
            >
              <Store className="size-3.5 text-primary" />
              <span className="text-[12px]">{i.locale === "ar" ? "المتجر" : "Marchand"}</span>
            </Link>
          )}
          <LocaleSwitch />
          <Avatar name={user.name} size={30} />
        </header>
        <main className="px-4 py-4">{children}
          {features.pwa_alerts && (
            <div className="mt-4">
              <CourierPwa />
            </div>
          )}
        </main>
        <CourierLocationSharer />
      </div>
      <CourierNav activeCount={todayActive} unread={unread} />
    </div>
  );
}
