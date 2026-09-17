import { getMerchantContext } from "@/lib/auth";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { PageHeader } from "@/components/shared";
import { SettingsClient, type StaffRow } from "@/components/merchant/settings-client";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await getMerchantContext();
  if (!ctx) return null;
  const i = await getI18n();

  const [staff, cycleChosenSetting] = await Promise.all([
    db.merchantStaff.findMany({
      where: { merchantId: ctx.merchant.id },
      include: { user: { select: { name: true, email: true, isActive: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.setting.findUnique({ where: { key: `merchant_cycle_chosen_${ctx.merchant.id}` } }),
  ]);
  const staffRows: StaffRow[] = staff.map((s) => ({
    id: s.id, name: s.user.name, email: s.user.email, role: s.staffRole, active: s.user.isActive,
  }));

  return (
    <>
      <PageHeader title={i.t("settings.title")} />
      <SettingsClient
        user={{ name: ctx.user.name, email: ctx.user.email, phone: ctx.user.phone }}
        store={{
          name: ctx.merchant.name, city: ctx.merchant.city, address: ctx.merchant.address,
          settlementCycle: ctx.merchant.settlementCycle, plan: ctx.merchant.plan, status: ctx.merchant.status,
        }}
        cycleLocked={cycleChosenSetting?.value === "true"}
        staff={staffRows}
      />
    </>
  );
}
