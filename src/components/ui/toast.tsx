"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Toast = { id: number; title: string; description?: string; variant?: "default" | "success" | "error" };
type ToastInput = Omit<Toast, "id">;

const ToastContext = React.createContext<{ push: (t: ToastInput) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = React.useCallback((t: ToastInput) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 end-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface p-3.5 shadow-lg animate-slide-up",
              t.variant === "success" && "border-success/30",
              t.variant === "error" && "border-error/30"
            )}
          >
            <span
              className={cn(
                "mt-0.5 size-2 shrink-0 rounded-full",
                t.variant === "success" ? "bg-success" : t.variant === "error" ? "bg-error" : "bg-primary"
              )}
            />
            <div className="min-w-0">
              <p className="text-[13px] font-medium leading-5">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[12.5px] leading-5 text-muted-foreground">{t.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast outside ToastProvider");
  return ctx;
}
