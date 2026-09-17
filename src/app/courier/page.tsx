import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/server/db";
import { PageHeader } from "@/components/shared";
import { CourierHomeClient, type CourierDelivery } from "@/components/courier/courier-home";
import { sortTour } from "@/server/dispatch";
import { cashSummary } from "@/server/cash";
import { getFeatureMap } from "@/server/features";
import { CashDeclaration } from "@/components/courier/cash-declaration";
import { QrScanButton } from "@/components/courier/qr-scanner";
import { BagReceive } from "@/components/courier/bag-receive";

export const metadata = { title: "Home" };

export default async function CourierHomePage() {
  const user = await getCurrentUser();
  if (!user?.courierProfile) return null;
  const i = await getI18n();
  const courier = user.courierProfile;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [deliveries, allDelivered] = await Promise.all([
    db.delivery.findMany({
      where: {
        courierId: courier.id,
        status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"] },
      },
      include: {
        order: { include: { customer: { select: { fullName: true, phone: true } } } },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "asc" }],
    }),
    db.delivery.findMany({
      where: { courierId: courier.id, deliveredAt: { gte: startOfToday } },
      select: { codCollected: true },
    }),
  ]);

  const rows: CourierDelivery[] = deliveries.map((d) => ({
    id: d.id,
    reference: d.order.reference,
    status: d.status,
    customerName: d.order.customer.fullName,
    customerPhone: d.order.customer.phone,
    address: d.order.deliveryAddress,
    city: d.order.deliveryCity,
    codAmount: d.order.codAmount,
    attempts: d.attempts,
    exchangeFor: d.order.exchangeFor,
    gpsLat: d.gpsLat,
    gpsLng: d.gpsLng,
    slotDate: d.order.slotDate,
    slotWindow: d.order.slotWindow,
  }));

  // nearest-neighbour tour ordering from the courier's last known position
  const ordered = sortTour(
    rows.map((r, idx) => ({ ...r, gpsLat: r.gpsLat ?? null, gpsLng: r.gpsLng ?? null, _i: idx })),
    { lat: courier.lastLat, lng: courier.lastLng }
  );
  const sortedRows = ordered.map(({ _i, ...r }) => r as CourierDelivery);
  const cash = await cashSummary(courier.id);
  const features = await getFeatureMap();
  const sealedBags = features.hub_bags
    ? await db.bag.findMany({ where: { status: "SEALED", OR: [{ courierId: courier.id }, { courierId: null }], city: courier.homeCity } })
    : [];

  const earnedToday = allDelivered.length * courier.feePerDelivery;
  const codToday = allDelivered.reduce((a, d) => a + d.codCollected, 0);
  const failedToday = 0;

  return (
    <>
      <h1 className="text-[20px] font-semibold tracking-[-0.02em]">
        {i.t("courier.greeting", { name: user.name.split(" ")[0] })}
      </h1>
      <p className="mt-0.5 text-[13px] text-muted-foreground">{i.t("courier.subtitle")}</p>

      <CourierHomeClient
        deliveries={sortedRows}
        courierName={user.name}
        feePerDelivery={courier.feePerDelivery}
        earnedToday={earnedToday}
        codToday={codToday}
        failedToday={failedToday}
        scanEnabled={features.qr_labels}
        slotEnabled={features.delivery_slots}
      />

      {sealedBags.length > 0 && (
        <div className="mt-4">
          <BagReceive bags={sealedBags.map((b) => ({ id: b.id, reference: b.reference, city: b.city, parcelCount: (JSON.parse(b.parcelRefs) as string[]).length }))} />
        </div>
      )}

      <div className="mt-4">
        <CashDeclaration summary={cash} />
      </div>
    </>
  );
}
