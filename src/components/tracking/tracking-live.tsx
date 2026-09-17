"use client";

import * as React from "react";
import { RadioTower } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { DeliveryMap, type MapPoint } from "@/components/map";

/** Live courier position via SSE — updates while the parcel is out for delivery. */
export function TrackingLive({
  reference,
  courierName,
  cityCenter,
}: {
  reference: string;
  courierName: string | null;
  cityCenter: { lat: number; lng: number };
}) {
  const { t, rel } = useI18n();
  const [position, setPosition] = React.useState<{ lat: number | null; lng: number | null; lastSeenAt: string | null } | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    const es = new EventSource(`/api/v1/tracking/${encodeURIComponent(reference)}/live`);
    es.addEventListener("open", () => setConnected(true));
    es.addEventListener("update", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      setStatus(data.status);
      if (data.courier) {
        setPosition({ lat: data.courier.lat, lng: data.courier.lng, lastSeenAt: data.courier.lastSeenAt });
      }
    });
    es.addEventListener("gone", () => es.close());
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, [reference]);

  const points: MapPoint[] = [];
  if (position?.lat != null && position?.lng != null) {
    points.push({ lat: position.lat, lng: position.lng, label: (courierName ?? "C")[0], color: "#2F45E0" });
  }
  points.push({ lat: cityCenter.lat, lng: cityCenter.lng, label: "📍", color: "#0E8345" });

  const hasFix = position?.lat != null && position?.lng != null;

  return (
    <div className="rounded-2xl border border-primary/25 bg-surface p-4 shadow-xs">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[13.5px] font-semibold">
          <RadioTower className="size-4 text-primary" /> {t("tracking.live.title")}
        </h2>
        <span className={"flex items-center gap-1.5 text-[11px] font-medium " + (connected ? "text-success" : "text-faint")}>
          <span className={"size-1.5 rounded-full " + (connected ? "animate-pulse bg-success" : "bg-faint")} />
          {connected ? "LIVE" : "…"}
        </span>
      </div>
      <p className="mb-3 text-[12px] leading-5 text-muted-foreground">{t("tracking.live.desc")}</p>
      <DeliveryMap points={points} height={190} zoom={13} />
      <p className="mt-2 text-[11.5px] text-faint">
        {hasFix && position?.lastSeenAt
          ? t("tracking.live.lastSeen", { time: rel(position.lastSeenAt) })
          : courierName
            ? courierName
            : "…"}
      </p>
      {status && status !== "OUT_FOR_DELIVERY" ? (
        <p className="mt-1 text-[11.5px] font-medium text-muted-foreground">{status}</p>
      ) : null}
    </div>
  );
}
