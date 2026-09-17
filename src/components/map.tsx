"use client";

import * as React from "react";
import "leaflet/dist/leaflet.css";

export type MapPoint = { lat: number; lng: number; label: string; color?: string };

/** Lightweight Leaflet map (OpenStreetMap tiles, no API key needed). */
export function DeliveryMap({ points, height = 260, zoom = 12 }: { points: MapPoint[]; height?: number; zoom?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    (async () => {
      try {
        const L = (await import("leaflet")).default;
        if (cancelled || !ref.current || points.length === 0) return;

        map = L.map(ref.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: false });
        L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
          attribution: "© OpenStreetMap · © CARTO",
          maxZoom: 19,
        }).addTo(map);

        const bounds = L.latLngBounds([]);
        for (const p of points) {
          const icon = L.divIcon({
            className: "",
            html: `<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:${p.color ?? "#2F45E0"};color:#fff;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid #fff">${p.label.slice(0, 2).toUpperCase()}</span>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });
          L.marker([p.lat, p.lng], { icon }).addTo(map!).bindPopup(p.label);
          bounds.extend([p.lat, p.lng]);
        }
        if (bounds.isValid()) map.fitBounds(bounds.pad(0.15), { maxZoom: zoom });
      } catch (e) {
        console.error("map failed", e);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points, zoom]);

  if (points.length === 0) return null;
  return <div ref={ref} style={{ height }} className="w-full overflow-hidden rounded-xl border border-border" />;
}
