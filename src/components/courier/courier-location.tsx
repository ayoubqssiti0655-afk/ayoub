"use client";

import * as React from "react";
import { useI18n } from "@/i18n/provider";
import { useToast } from "@/components/ui/toast";

/**
 * Silent GPS beacon for live customer tracking: watches the courier's position
 * and POSTs it (throttled to ~20s or ~100m of movement) to /api/v1/courier/position.
 */
export function CourierLocationSharer() {
  const { t } = useI18n();
  const toast = useToast();
  const last = React.useRef<{ lat: number; lng: number; at: number } | null>(null);
  const [announced, setAnnounced] = React.useState(false);

  React.useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const prev = last.current;
        const moved = !prev || Math.hypot(lat - prev.lat, lng - prev.lng) > 0.001; // ~100m
        const stale = !prev || Date.now() - prev.at > 20000;
        if (!moved && !stale) return;
        last.current = { lat, lng, at: Date.now() };
        fetch("/api/v1/courier/position", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
          keepalive: true,
        }).catch(() => {});
        if (!announced) {
          setAnnounced(true);
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 8000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [announced]);

  // one-time subtle confirmation
  React.useEffect(() => {
    if (announced) toast.push({ title: t("courier.shareLocation") });
  }, [announced]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
