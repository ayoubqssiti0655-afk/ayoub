import { redirect } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Users, Truck, RotateCcw, Wallet, ChartLine, Plug, Settings, Plus, PhoneCall, LifeBuoy, FileText, Store } from "lucide-react";
import { db } from "@/server/db";
import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/server/features";
import { AppShell, type NavSection } from "@/components/layout/app-shell";


export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const merchantId = user.staffProfile?.merchantId;
  if (!merchantId) redirect("/login");

  const [merchant, newOrders, unread, taxInvoicesEnabled] = await Promise.all([
    db.merchant.findUnique({ where: { id: merchantId } }),
    db.order.count({ where: { merchantId, status: "NEW" } }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
    isFeatureEnabled("tax_invoices"),
  ]);
  if (!merchant) redirect("/login");

  const nav: NavSection[] = [
    {
      items: [{ href: "/app", label: "nav.dashboard", icon: "LayoutDashboard" }],
    },
    {
      items: [{ href: "/app/orders/new", label: "nav.newOrder", icon: "Plus" }],
    },
    {
      label: "nav.group.operations",
      items: [
        { href: "/app/confirmations", label: "confirm.title", icon: "PhoneCall", badge: newOrders || undefined },
        { href: "/app/orders", label: "nav.orders", icon: "ShoppingCart", badge: newOrders || undefined },
        { href: "/app/deliveries", label: "nav.deliveries", icon: "Truck" },
        { href: "/app/returns", label: "nav.returns", icon: "RotateCcw" },
      ],
    },
    {
      label: "nav.group.catalog",
      items: [
        { href: "/app/products", label: "nav.products", icon: "Package" },
        { href: "/app/customers", label: "nav.customers", icon: "Users" },
      ],
    },
    {
      label: "nav.group.finance",
      items: [
        { href: "/app/wallet", label: "nav.wallet", icon: "Wallet" },
        ...(taxInvoicesEnabled ? [{ href: "/app/invoices", label: "invoices.title", icon: "FileText" as const }] : []),
        { href: "/app/analytics", label: "nav.analytics", icon: "ChartLine" },
      ],
    },
    {
      label: "nav.group.configuration",
      items: [
        { href: "/app/integrations", label: "nav.integrations", icon: "Plug" },
        { href: "/app/settings", label: "nav.settings", icon: "Settings" },
        { href: "/app/tickets", label: "tickets.title", icon: "LifeBuoy" },
        { href: "/store/" + merchant.slug, label: "storefront.open", icon: "Store" },
      ],
    },
    ...(user.courierProfile
      ? [
          {
            label: "nav.group.courier",
            items: [{ href: "/courier", label: "nav.courierApp", icon: "Bike" }],
          },
        ]
      : []),
  ];

  return (
    <AppShell
      nav={nav}
      user={{ name: user.name, email: user.email, subtitle: merchant.name }}
      unread={unread}
    >
      {merchant.status === "SUSPENDED" && (
        <div className="mb-4 rounded-xl border border-error/30 bg-error-soft px-4 py-3 text-[13px] font-medium text-error">
          Your account is suspended — deliveries are paused. Contact support to reactivate.
        </div>
      )}
      {children}
    </AppShell>
  );
}
