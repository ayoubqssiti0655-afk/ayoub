import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/server/db";
import { AppShell, type NavSection } from "@/components/layout/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const [pendingMerchants, unread] = await Promise.all([
    db.merchant.count({ where: { status: "PENDING" } }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  const nav: NavSection[] = [
    { items: [{ href: "/admin", label: "nav.dashboard", icon: "LayoutDashboard" }] },
    {
      label: "nav.group.operations",
      items: [
        { href: "/admin/orders", label: "nav.orders", icon: "ShoppingCart" },
        { href: "/admin/deliveries", label: "nav.deliveries", icon: "Truck" },
        { href: "/admin/returns", label: "nav.returns", icon: "RotateCcw" },
      ],
    },
    {
      label: "nav.group.network",
      items: [
        { href: "/admin/merchants", label: "nav.merchants", icon: "Building2", badge: pendingMerchants || undefined },
        { href: "/admin/couriers", label: "nav.couriers", icon: "Bike" },
      ],
    },
    {
      label: "nav.group.finance",
      items: [
        { href: "/admin/settlements", label: "nav.settlements", icon: "Banknote" },
        { href: "/admin/analytics", label: "nav.analytics", icon: "ChartLine" },
      ],
    },
    {
      label: "nav.group.configuration",
      items: [
        { href: "/admin/hub", label: "hub.title", icon: "PackageOpen" },
        { href: "/admin/zones", label: "nav.zones", icon: "MapPinned" },
        { href: "/admin/pricing", label: "nav.pricing", icon: "Tags" },
        { href: "/admin/audit", label: "nav.audit", icon: "ScrollText" },
        { href: "/admin/notifications", label: "nav.notificationsLog", icon: "Bell" },
        { href: "/admin/features", label: "features.title", icon: "Sparkles" },
        { href: "/admin/settings", label: "admin.settings.title", icon: "Settings" },
      ],
    },
  ];

  return (
    <AppShell nav={nav} user={{ name: user.name, email: user.email, subtitle: user.role === "ADMIN" ? "Masar HQ" : undefined }} unread={unread} searchEnabled>
      {children}
    </AppShell>
  );
}
