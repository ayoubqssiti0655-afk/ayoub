import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { PageHeader } from "@/components/shared";
import { AdminSettingsClient } from "@/components/admin/admin-settings-client";

export const metadata = { title: "Admin Settings" };

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const i = await getI18n();

  const settingsRows = await db.setting.findMany({
    where: {
      key: { in: ["platform_name", "platform_support_phone"] },
    },
  });

  const settingsMap = new Map(settingsRows.map((s) => [s.key, s.value]));

  return (
    <div className="space-y-6">
      <PageHeader
        title={i.t("admin.settings.title")}
        subtitle={i.t("admin.settings.subtitle")}
      />
      <AdminSettingsClient
        admin={{
          id: user.id,
          name: user.name,
          email: user.email,
        }}
        settings={{
          platformName: settingsMap.get("platform_name") ?? "Masar Delivery",
          supportPhone: settingsMap.get("platform_support_phone") ?? "+212 600-000000",
        }}
      />
    </div>
  );
}

