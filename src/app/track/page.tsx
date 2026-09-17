import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { TrackForm, LocaleSwitch } from "@/components/tracking/track-form";
import { TrackingLive } from "@/components/tracking/tracking-live";
import { TrackingPay } from "@/components/tracking/tracking-pay";
import { TrackingExtras } from "@/components/tracking/tracking-extras";
import { Logo } from "@/components/logo";
import { StatusBadge } from "@/components/status-badge";
import { Banknote, Building2, CalendarClock as CalendarClockIcon, Clock3, MapPin, MapPin as MapPinIcon, Phone, User } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { getFeatureMap } from "@/server/features";

export const metadata = {
  title: "Track your parcel",
};

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const i = await getI18n();
  const { ref } = await searchParams;
  const code = (ref ?? "").trim().toUpperCase();

  const order = code
    ? await db.order.findUnique({
        where: { reference: code },
        include: {
          merchant: { select: { name: true } },
          courier: { include: { user: { select: { name: true } } } },
          events: { orderBy: { createdAt: "asc" } },
          delivery: { select: { id: true, outForDeliveryAt: true, otpCode: true, deliveredAt: true } },
          items: { select: { id: true } },
        },
      })
    : null;

  const lastEvent = order?.events[order.events.length - 1];
  const cityRecord = order ? await db.city.findFirst({ where: { nameFr: order.deliveryCity }, select: { lat: true, lng: true } }) : null;
  const features = await getFeatureMap();
  const relaisPoints = order && features.pickup_points
    ? await db.pickupPoint.findMany({ where: { city: order.deliveryCity, isActive: true } })
    : [];
  const existingRating = order?.delivery ? await db.deliveryRating.findUnique({ where: { deliveryId: order.delivery.id } }) : null;

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-5">
          <Link href="/"><Logo /></Link>
          <LocaleSwitch />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 py-8">
        <h1 className="text-center text-[22px] font-semibold tracking-[-0.02em]">{i.t("tracking.title")}</h1>
        <p className="mx-auto mt-1.5 max-w-sm text-center text-[13.5px] leading-5 text-muted-foreground">{i.t("tracking.subtitle")}</p>

        <TrackForm initialRef={code} />

        {code && !order && (
          <div className="mt-6 rounded-2xl border border-error/30 bg-error-soft p-5 text-center">
            <p className="text-[14.5px] font-semibold text-error">{i.t("tracking.notFound")}</p>
            <p className="mt-1 text-[13px] text-error/80">{i.t("tracking.notFoundDesc")}</p>
          </div>
        )}

        {order && (
          <div className="mt-6 space-y-4 animate-slide-up">
            {/* status banner */}
            <div
              className="rounded-2xl border p-5 text-center"
              style={{
                borderColor: order.status === "DELIVERED" ? "color-mix(in srgb, var(--success) 30%, transparent)" : order.status === "FAILED" ? "color-mix(in srgb, var(--error) 30%, transparent)" : "color-mix(in srgb, var(--info) 30%, transparent)",
                background: order.status === "DELIVERED" ? "var(--success-soft)" : order.status === "FAILED" ? "var(--error-soft)" : "var(--info-soft)",
              }}
            >
              <div className="flex justify-center"><StatusBadge status={order.status} /></div>
              <p className="mt-2 text-[13px] text-muted-foreground">
                {order.status === "DELIVERED" && order.deliveredAt ? (
                  <>{i.t("tracking.deliveredAt")} {i.dateTime(order.deliveredAt)}</>
                ) : order.etaDate ? (
                  <><Clock3 className="me-1 inline size-3.5" />{i.t("tracking.etaLabel")} : <strong>{i.date(order.etaDate)}</strong></>
                ) : null}
              </p>
              <p className="mt-0.5 text-[11.5px] text-faint">
                {i.t("tracking.lastUpdate")} : {lastEvent ? i.rel(lastEvent.createdAt) : "—"}
              </p>
            </div>

            {/* live courier map */}
            {order.status === "OUT_FOR_DELIVERY" && cityRecord && features.live_tracking && (
              <TrackingLive
                reference={order.reference}
                courierName={order.courier?.user.name ?? null}
                cityCenter={{ lat: cityRecord.lat, lng: cityRecord.lng }}
              />
            )}

            {/* online payment */}
            {order.paymentMethod === "COD" && order.codAmount > 0 && features.online_payment && !["DELIVERED", "RETURNED", "CANCELLED"].includes(order.status) && (
              <TrackingPay reference={order.reference} amountLabel={i.money(order.codAmount)} />
            )}

            {/* delivery slots */}
            {order.slotDate ? (
              <p className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary-soft px-4 py-2.5 text-[13px] font-semibold text-primary">
                <CalendarClockIcon className="size-4" /> {i.t("slot.chosen")} : {order.slotDate} · {order.slotWindow}
              </p>
            ) : features.delivery_slots && order.status !== "DELIVERED" && !["CANCELLED", "RETURNED"].includes(order.status) && ["CONFIRMED", "READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(order.status) ? (
              <TrackingExtras reference={order.reference} mode="slot" slot={null} />
            ) : null}

            {/* pickup points */}
            {features.pickup_points && !order.pickupPointId && relaisPoints.length > 0 && ["CONFIRMED", "READY_FOR_PICKUP", "PICKED_UP"].includes(order.status) && (
              <TrackingExtras
                reference={order.reference}
                mode="relais"
                points={relaisPoints.map((p) => ({ id: p.id, name: p.name, address: p.address, phone: p.phone }))}
              />
            )}
            {order.pickupPointId && (
              <p className="flex items-center gap-2 rounded-xl border border-info/25 bg-info-soft px-4 py-2.5 text-[13px] font-medium text-info">
                <MapPinIcon className="size-4" /> {i.t("relais.chosen")}
              </p>
            )}

            {/* post-delivery rating */}
            {features.post_delivery_rating && order.status === "DELIVERED" && (
              <TrackingExtras reference={order.reference} mode="rate" hasRated={!!existingRating} rating={existingRating?.stars ?? null} />
            )}

            {/* OTP when out for delivery */}
            {order.status === "OUT_FOR_DELIVERY" && order.delivery?.otpCode && (
              <div className="rounded-2xl border border-primary/30 bg-primary-soft p-5 text-center">
                <p className="text-[12.5px] font-medium text-primary">{i.t("tracking.otpShow")}</p>
                <p className="mt-1 text-[30px] font-bold tracking-[0.28em] text-primary tnum">{order.delivery.otpCode}</p>
                <p className="mt-1 text-[12px] text-primary/75">{i.t("tracking.otpDesc")}</p>
              </div>
            )}

            {/* info grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <InfoTile icon={<Building2 className="size-4" />} label={i.t("tracking.merchant")} value={order.merchant.name} />
              <InfoTile icon={<MapPin className="size-4" />} label={i.t("tracking.deliveryCity")} value={order.deliveryCity} />
              <InfoTile icon={<User className="size-4" />} label={i.t("tracking.orderDate")} value={i.date(order.createdAt)} />
              <InfoTile icon={<Banknote className="size-4" />} label={i.t("payment.COD")} value={order.codAmount > 0 ? i.money(order.codAmount) : i.t("payment.PREPAID")} />
            </div>

            {order.codAmount > 0 && order.status !== "DELIVERED" && (
              <p className="rounded-xl border border-warning/25 bg-warning-soft px-4 py-2.5 text-center text-[12.5px] font-medium text-warning">
                {i.t("tracking.codNote", { amount: i.money(order.codAmount) })}
              </p>
            )}

            {/* courier */}
            {order.status === "OUT_FOR_DELIVERY" && order.courier && (
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-[14px] font-bold text-primary">
                  {order.courier.user.name[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-muted-foreground">{i.t("tracking.courier")}</p>
                  <p className="truncate text-[14px] font-semibold">{order.courier.user.name}</p>
                </div>
              </div>
            )}

            {/* timeline */}
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
              <p className="mb-3 text-[13.5px] font-semibold">{i.t("tracking.timeline")}</p>
              <ol>
                {order.events
                  .filter((e) => e.type !== "NOTE")
                  .reverse()
                  .map((e, idx, arr) => (
                    <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                      <span className="absolute bottom-0 start-[5px] top-3.5 w-px bg-border" aria-hidden />
                      <span
                        className="relative mt-1 size-2.5 shrink-0 rounded-full"
                        style={{ background: idx === 0 ? "var(--primary)" : "var(--border-strong)", boxShadow: idx === 0 ? "0 0 0 3px var(--primary-soft)" : undefined }}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium leading-5">{i.t(`event.${e.type}`)}</p>
                        {e.message && <p className="text-[12px] leading-5 text-muted-foreground">{e.message}</p>}
                        <p className="text-[11px] text-faint">{i.dateTime(e.createdAt)}</p>
                      </div>
                    </li>
                  ))}
              </ol>
            </div>

            {/* support */}
            <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-xs">
              <p className="text-[13px] font-medium">{i.t("tracking.support")}</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">{i.t("footer.contactHint")}</p>
              <a
                href={`tel:${i.t("support.phone").replace(/\s/g, "")}`}
                className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-[13.5px] font-semibold text-primary-foreground shadow-xs"
              >
                <Phone className="size-4" /> {i.t("tracking.callSupport")}
              </a>
            </div>
          </div>
        )}
      </main>

      <footer className="py-8 text-center">
        <p className="text-[11.5px] text-faint">
          {i.t("tracking.poweredBy")} <Link href="/" className="font-medium text-muted-foreground hover:text-foreground">Masar</Link>
        </p>
      </footer>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">{icon} {label}</p>
      <p className="mt-1 truncate text-[13.5px] font-semibold">{value}</p>
    </div>
  );
}
