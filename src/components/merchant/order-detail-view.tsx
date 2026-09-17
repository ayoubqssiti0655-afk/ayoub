import Link from "next/link";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Avatar } from "@/components/ui/misc";
import { OrderActions, NoteComposer } from "@/components/merchant/order-actions";
import { CopyableRef } from "@/components/merchant/copy-ref";
import { AdminOrderActions } from "@/components/admin/admin-order-actions";
import { DisputeButton } from "@/components/merchant/dispute-button";
import { avatarHue, mapsLink, waLink } from "@/lib/format";
import { ChevronLeft, Phone, MessageCircle, MapPin, Banknote, Truck, Clock3 } from "lucide-react";

export async function OrderDetailView({ id, mode }: { id: string; mode: "merchant" | "admin" }) {
  const i = await getI18n();
  const features = await (async () => (await import("@/server/features")).getFeatureMap())();

  let merchantIdFilter: string | null = null;
  if (mode === "merchant") {
    const { getMerchantContext } = await import("@/lib/auth");
    const ctx = await getMerchantContext();
    if (!ctx) return null;
    merchantIdFilter = ctx.merchant.id;
  }

  const order = await db.order.findUnique({
    where: { id },
    include: {
      customer: true,
      merchant: { select: { id: true, name: true } },
      courier: { include: { user: { select: { name: true, phone: true } } } },
      items: true,
      events: { orderBy: { createdAt: "asc" } },
      delivery: { include: { attemptsLog: { orderBy: { number: "desc" } } } },
      returns: { orderBy: { requestedAt: "desc" } },
    },
  });
  if (!order) return null;
  if (merchantIdFilter && order.merchantId !== merchantIdFilter) return null;

  const backHref = mode === "merchant" ? "/app/orders" : "/admin/orders";

  const couriers = await db.courier.findMany({
    where: { status: "ACTIVE" },
    include: { user: { select: { name: true } } },
    orderBy: { employeeCode: "asc" },
  });

  const steps = [
    { key: "CREATED", label: i.t("event.CREATED"), at: order.createdAt, done: true },
    { key: "CONFIRMED", label: i.t("event.CONFIRMED"), at: order.confirmedAt, done: !!order.confirmedAt },
    { key: "READY", label: i.t("event.READY"), at: null, done: ["READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED"].includes(order.status) },
    { key: "PICKED_UP", label: i.t("event.PICKED_UP"), at: order.pickedUpAt, done: !!order.pickedUpAt },
    { key: "IN_TRANSIT", label: i.t("event.IN_TRANSIT"), at: null, done: ["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED"].includes(order.status) },
    { key: "OUT_FOR_DELIVERY", label: i.t("event.OUT_FOR_DELIVERY"), at: order.delivery?.outForDeliveryAt, done: ["OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED"].includes(order.status) },
    { key: "DELIVERED", label: i.t("event.DELIVERED"), at: order.deliveredAt, done: order.status === "DELIVERED" },
  ];
  const activeIdx = steps.findIndex((s) => !s.done);

  return (
    <>
      <div className="mb-4">
        <Link href={backHref} className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-3.5 rtl:rotate-180" /> {i.t("orders.title")}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[19px] font-semibold tracking-[-0.02em] tnum">{order.reference}</h1>
            <StatusBadge status={order.status} />
            <CopyableRef value={order.reference} label={i.t("order.detail.copyTracking")} />
            {order.slotDate && features.delivery_slots && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary-soft px-2 py-0.5 text-[11.5px] font-medium text-primary">
                {order.slotDate} · {order.slotWindow}
              </span>
            )}
            {order.exchangeFor && features.exchange_orders && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-violet/30 bg-violet-soft px-2 py-0.5 text-[11.5px] font-medium text-violet">
                {i.t("exchange.badge")} · <span className="tnum">{order.exchangeFor}</span>
              </span>
            )}
            {mode === "admin" && (
              <Link href={`/admin/merchants/${order.merchant.id}`} className="text-[12.5px] text-muted-foreground hover:text-primary hover:underline">
                {order.merchant.name}
              </Link>
            )}
          </div>
          {mode === "merchant" && (
            <DisputeButton orderId={order.id} disabled={!features.disputes} />
          )}
          {mode === "merchant" && features.qr_labels && (
            <Link
              href={`/app/orders/${order.id}/label`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[12.5px] font-medium shadow-xs hover:bg-muted"
            >
              {i.t("label.print")}
            </Link>
          )}
          {mode === "merchant" ? (
            <OrderActions
              orderId={order.id}
              status={order.status}
              courierId={order.courierId}
              attemptCount={order.attemptCount}
              couriers={couriers.map((c) => ({ id: c.id, name: c.user.name, city: c.homeCity }))}
            />
          ) : (
            <AdminOrderActions orderId={order.id} courierId={order.courierId} couriers={couriers.map((c) => ({ id: c.id, name: c.user.name, city: c.homeCity }))} />
          )}
        </div>
      </div>

      {/* stepper */}
      <div className="mb-4 overflow-x-auto rounded-xl border border-border bg-surface p-4 shadow-xs">
        <ol className="flex min-w-[640px] items-start">
          {steps.map((s, idx) => {
            const isActive = idx === activeIdx && !["CANCELLED"].includes(order.status);
            const failed = order.status === "FAILED" && s.key === "OUT_FOR_DELIVERY";
            return (
              <li key={s.key} className="relative flex-1">
                <div className="flex items-center">
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold"
                    style={{
                      borderColor: s.done ? "var(--success)" : isActive ? "var(--primary)" : failed ? "var(--error)" : "var(--border-strong)",
                      background: s.done ? "var(--success)" : isActive ? "var(--primary)" : "transparent",
                      color: s.done ? "#fff" : isActive ? "#fff" : "var(--faint-foreground)",
                    }}
                  >
                    {s.done ? "✓" : idx + 1}
                  </span>
                  {idx < steps.length - 1 && (
                    <span className="mx-1 h-0.5 flex-1 rounded" style={{ background: steps[idx + 1].done ? "var(--success)" : "var(--border)" }} />
                  )}
                </div>
                <p className="mt-1.5 pe-2 text-[11px] font-medium leading-tight" style={{ color: s.done || isActive ? "var(--foreground)" : "var(--faint-foreground)" }}>
                  {s.label}
                </p>
              </li>
            );
          })}
        </ol>
        {order.status === "FAILED" && order.delivery?.nextActionAt && (
          <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-[12px] font-medium text-warning">
            {i.t("order.detail.autoRetry")} — {i.dateTime(order.delivery.nextActionAt)}
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* main column */}
        <div className="space-y-4">
          {/* items */}
          <Card>
            <CardContent className="p-0">
              <h2 className="border-b border-border px-4 py-3 text-[13.5px] font-semibold">{i.t("common.items")}</h2>
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>{i.t("common.items")}</TH>
                    <TH className="text-center">{i.t("common.quantity")}</TH>
                    <TH className="text-end">{i.t("common.price")}</TH>
                    <TH className="text-end">{i.t("common.total")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {order.items.map((it) => (
                    <TR key={it.id}>
                      <TD className="font-medium">{it.name}{it.sku && <span className="ms-2 text-[11px] text-faint tnum">{it.sku}</span>}</TD>
                      <TD className="text-center tnum">× {it.quantity}</TD>
                      <TD className="text-end tnum">{i.money(it.unitPrice)}</TD>
                      <TD className="text-end font-semibold tnum">{i.money(it.total)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <div className="space-y-1.5 border-t border-border px-4 py-3 text-[13px]">
                <Row label={i.t("common.subtotal")} value={i.money(order.itemsTotal)} />
                <Row label={i.t("common.shippingFee")} value={i.money(order.shippingFee)} />
                {order.discount > 0 && <Row label={i.t("common.discount")} value={`− ${i.money(order.discount)}`} />}
                <div className="flex justify-between border-t border-border pt-2 font-semibold">
                  <span>{i.t("common.total")}</span>
                  <span className="tnum">{i.money(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* attempts */}
          {order.delivery && order.delivery.attemptsLog.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h2 className="mb-3 text-[13.5px] font-semibold">{i.t("order.detail.attempts")}</h2>
                <ul className="space-y-2.5">
                  {order.delivery.attemptsLog.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                      <span className="flex size-6 items-center justify-center rounded-md bg-muted text-[11px] font-bold tnum">{a.number}</span>
                      <span className="text-[12.5px] font-semibold" style={{ color: a.result === "DELIVERED" ? "var(--success)" : "var(--error)" }}>
                        {a.result === "DELIVERED" ? i.t("status.DELIVERED") : (a.reason ? i.t(`fail.${a.reason}`) !== `fail.${a.reason}` ? i.t(`fail.${a.reason}`) : a.reason : i.t("status.FAILED"))}
                      </span>
                      {a.courierNote && <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">“{a.courierNote}”</span>}
                      {a.proofType && <span className="rounded bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">{a.proofType}</span>}
                      <span className="ms-auto text-[11.5px] text-faint">{i.dateTime(a.occurredAt)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* notes & activity */}
          <Card>
            <CardContent className="p-4">
              <h2 className="mb-3 text-[13.5px] font-semibold">{i.t("order.detail.notes")}</h2>
              <NoteComposer orderId={order.id} />
              <ul className="mt-4 space-y-0">
                {order.events.slice().reverse().map((e, idx) => (
                  <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                    <span className="absolute bottom-0 start-[3.5px] top-4 w-px bg-border" aria-hidden />
                    <span className="relative mt-1.5 size-2 shrink-0 rounded-full" style={{ background: idx === 0 ? "var(--primary)" : "var(--border-strong)" }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium leading-5">
                        {i.t(`event.${e.type}`)}
                        {e.message && <span className="ms-1.5 font-normal text-muted-foreground">— {e.message}</span>}
                      </p>
                      <p className="text-[11px] text-faint">
                        {i.dateTime(e.createdAt)} · {e.actorName ?? e.actorType}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* sidebar */}
        <div className="space-y-4">
          {/* customer */}
          <Card>
            <CardContent className="p-4">
              <h2 className="mb-3 text-[13.5px] font-semibold">{i.t("order.detail.customer")}</h2>
              <div className="flex items-center gap-2.5">
                <Avatar name={order.customer.fullName} size={36} hue={avatarHue(order.customer.fullName)} />
                <div className="min-w-0">
                  {mode === "merchant" ? (
                    <Link href={`/app/customers/${order.customer.id}`} className="block truncate text-[13.5px] font-semibold hover:text-primary hover:underline">
                      {order.customer.fullName}
                    </Link>
                  ) : (
                    <span className="block truncate text-[13.5px] font-semibold">{order.customer.fullName}</span>
                  )}
                  <p className="text-[12px] text-muted-foreground tnum" dir="ltr">{i.phone(order.customer.phone)}</p>
                </div>
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[12.5px] leading-5 text-muted-foreground">
                <MapPin className="mt-0.5 size-3.5 shrink-0" />
                {order.deliveryAddress}, {order.deliveryCity}
              </p>
              {order.notes && (
                <p className="mt-2 rounded-lg bg-warning-soft px-2.5 py-1.5 text-[12px] leading-5 text-warning">{order.notes}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`tel:${order.customer.phone}`} className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-[12.5px] font-medium shadow-xs transition-colors hover:bg-muted">
                  <Phone className="size-3.5" /> {i.t("common.call")}
                </a>
                <a
                  href={waLink(
                    order.customer.phone,
                    i.t("whatsapp.merchantMessage", {
                      name: order.customer.fullName,
                      merchant: order.merchant.name,
                      ref: order.reference,
                      cod: i.money(order.codAmount),
                    })
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#25D366]/30 bg-[#25D366]/10 text-[12.5px] font-semibold text-[#25D366] shadow-xs transition-colors hover:bg-[#25D366]/20"
                >
                  <MessageCircle className="size-3.5" /> WhatsApp
                </a>
                <a href={mapsLink(order.delivery?.gpsLat, order.delivery?.gpsLng, `${order.deliveryAddress}, ${order.deliveryCity}`)} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[12.5px] font-medium shadow-xs transition-colors hover:bg-muted">
                  <MapPin className="size-3.5" /> {i.t("common.navigate")}
                </a>
              </div>
            </CardContent>
          </Card>

          {/* payment */}
          <Card>
            <CardContent className="p-4">
              <h2 className="mb-3 text-[13.5px] font-semibold">{i.t("order.detail.payment")}</h2>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px]">
                  <Banknote className="size-4 text-muted-foreground" />
                  {i.t(`payment.${order.paymentMethod}`)}
                </span>
                <StatusBadge status={order.status === "DELIVERED" ? "COLLECTED" : order.paymentMethod === "PREPAID" ? "COLLECTED" : "PENDING"} size="sm" />
              </div>
              {order.codAmount > 0 && (
                <p className="mt-3 rounded-lg border border-success/25 bg-success-soft px-3 py-2">
                  <span className="block text-[11.5px] font-medium text-success">{i.t("order.detail.codToCollect")}</span>
                  <span className="text-[18px] font-semibold text-success tnum">{i.money(order.codAmount)}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* courier */}
          <Card>
            <CardContent className="p-4">
              <h2 className="mb-3 text-[13.5px] font-semibold">{i.t("order.detail.courier")}</h2>
              {order.courier ? (
                <div className="flex items-center gap-2.5">
                  <Avatar name={order.courier.user.name} size={36} hue={avatarHue(order.courier.user.name)} />
                  <div>
                    <p className="text-[13.5px] font-semibold">{order.courier.user.name}</p>
                    <p className="text-[12px] text-muted-foreground tnum">{order.courier.employeeCode} · {order.courier.homeCity}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[12.5px] text-muted-foreground">{i.t("common.unassigned")}</p>
              )}
              {order.etaDate && (
                <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                  <Clock3 className="size-3.5" /> {i.t("common.eta")} : <strong className="font-semibold">{i.date(order.etaDate)}</strong>
                </p>
              )}
              {order.delivery?.gpsLat != null && (
                <a href={mapsLink(order.delivery.gpsLat, order.delivery.gpsLng)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-primary hover:underline">
                  <Truck className="size-3.5" /> {i.t("common.navigate")}
                </a>
              )}
            </CardContent>
          </Card>

          {/* proof of delivery */}
          {order.status === "DELIVERED" && order.delivery && (
            <Card>
              <CardContent className="p-4">
                <h2 className="mb-3 text-[13.5px] font-semibold">{i.t("order.detail.proofOfDelivery")}</h2>
                <div className="space-y-2 text-[12.5px]">
                  {order.delivery.proofSignature && (
                    <div>
                      <p className="mb-1 text-muted-foreground">{i.t("order.detail.podSigned")}</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={order.delivery.proofSignature} alt="Signature" className="h-16 rounded-lg border border-border bg-white" />
                    </div>
                  )}
                  <ul className="space-y-1 text-muted-foreground">
                    {order.delivery.otpCode && <li>OTP : <span className="font-semibold text-foreground tnum">{order.delivery.otpCode}</span></li>}
                    {order.delivery.deliveredAt && <li>{i.t("order.detail.timeline")} : {i.dateTime(order.delivery.deliveredAt)}</li>}
                    {order.delivery.attempts > 0 && <li>{i.t("order.detail.attempts")} : {order.delivery.attempts}</li>}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tnum">{value}</span>
    </div>
  );
}
