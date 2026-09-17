"use client";

import * as React from "react";
import { BellRing } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { useToast } from "@/components/ui/toast";

/**
 * PWA glue for the courier app: registers the service worker, polls for new
 * parcel assignments and surfaces them as an in-app toast + a system
 * notification when the user granted permission.
 */
export function CourierPwa() {
  const { t } = useI18n();
  const toast = useToast();
  const [permission, setPermission] = React.useState<NotificationPermission | "unsupported">("default");
  const latestSeen = React.useRef<string | null>(null);

  React.useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
  }, []);

  // poll for new assignments
  React.useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/v1/courier/alerts");
        if (!res.ok || !alive) return;
        const j = await res.json();
        const latest = j.data.latest;
        if (j.data.count > 0 && latest) {
          const key = latest.createdAt;
          if (latestSeen.current && latestSeen.current !== key) {
            toast.push({ title: t("courier.alerts.title"), description: latest.body ?? undefined });
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification(t("courier.alerts.title"), { body: latest.body ?? "", icon: "/icon.svg" });
            }
          }
          latestSeen.current = key;
        }
      } catch {}
    };
    poll();
    const timer = setInterval(poll, 30000);
    return () => { alive = false; clearInterval(timer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function enable() {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") toast.push({ title: t("courier.alerts.enabled"), variant: "success" });
  }

  if (permission !== "default") return null;
  return (
    <button
      onClick={enable}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary-soft py-2.5 text-[12.5px] font-semibold text-primary"
    >
      <BellRing className="size-4" /> {t("courier.alerts.enable")}
    </button>
  );
}
