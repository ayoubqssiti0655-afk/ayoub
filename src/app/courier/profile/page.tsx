import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/courier/sign-out";
import { getI18n } from "@/i18n/server";
import { Avatar } from "@/components/ui/misc";
import { Star } from "lucide-react";
import { avatarHue } from "@/lib/format";
import { db } from "@/server/db";
import { CourierProfileClient } from "@/components/courier/courier-profile-client";

export const metadata = { title: "Profile" };

export default async function CourierProfilePage() {
  const user = await getCurrentUser();
  if (!user?.courierProfile) return null;
  const i = await getI18n();
  const courier = user.courierProfile;
  const zones = JSON.parse(courier.zones) as string[];
  const [delivered, failed, cities] = await Promise.all([
    db.delivery.count({ where: { courierId: courier.id, status: "DELIVERED" } }),
    db.delivery.count({ where: { courierId: courier.id, status: "FAILED" } }),
    db.city.findMany({ orderBy: { nameFr: "asc" }, select: { nameFr: true } }),
  ]);
  const successRate = delivered + failed > 0 ? delivered / (delivered + failed) : 0;

  return (
    <>
      <div className="flex flex-col items-center py-4">
        <Avatar name={user.name} size={64} hue={avatarHue(user.name)} />
        <h1 className="mt-2.5 text-[18px] font-semibold">{user.name}</h1>
        <p className="text-[12.5px] text-muted-foreground tnum" dir="ltr">{i.phone(user.phone)}</p>
        <div className="mt-2 flex items-center gap-1 rounded-full border border-warning/30 bg-warning-soft px-3 py-1">
          <Star className="size-3.5 fill-warning text-warning" />
          <span className="text-[13px] font-semibold text-warning tnum">{courier.rating.toFixed(1)}</span>
        </div>
      </div>

      <CourierProfileClient
        name={user.name}
        phone={user.phone ?? ""}
        email={user.email}
        vehicle={courier.vehicle}
        zones={zones}
        employeeCode={courier.employeeCode}
        status={courier.status}
        lastSeenAt={courier.lastSeenAt?.toISOString() ?? null}
        delivered={delivered}
        successRate={successRate}
        earnings={delivered * courier.feePerDelivery}
        cities={cities.map((city) => city.nameFr)}
      />

      <SignOutButton />
    </>
  );
}
