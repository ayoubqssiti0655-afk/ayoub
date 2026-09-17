// Pure HTML/CSS product mockups for the landing page (no images needed).

export function DashboardMock({ variant = "full" }: { variant?: "full" | "analytics" }) {
  const bars = [34, 52, 40, 66, 58, 78, 62, 84, 72, 90, 80, 96, 88, 74, 92];
  const days = ["1", "4", "7", "10", "13", "16", "19", "22", "25", "28", "30"];

  if (variant === "analytics") {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold">Statistiques</p>
          <span className="rounded-md border border-border px-2 py-0.5 text-[10.5px] text-muted-foreground">30 j</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {[["Commandes", "812", "var(--chart-1)"], ["Réussite", "94 %", "var(--chart-2)"], ["COD", "86 400 DH", "var(--chart-5)"]].map(([l, v, c]) => (
            <div key={l} className="rounded-xl border border-border bg-surface-2 p-3">
              <p className="text-[10.5px] text-muted-foreground">{l}</p>
              <p className="mt-0.5 text-[15px] font-semibold tnum" style={{ color: c }}>{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex h-28 items-end gap-1.5">
          {bars.map((h, idx) => (
            <div key={idx} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: idx === bars.length - 1 ? "var(--primary)" : "var(--chart-3)", opacity: idx === bars.length - 1 ? 1 : 0.35 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[56px_1fr] text-[11px] md:grid-cols-[180px_1fr]">
      {/* sidebar */}
      <div className="border-e border-border p-3">
        <div className="flex items-center gap-1.5">
          <span className="flex size-5 items-center justify-center rounded-md bg-primary text-[9px] font-bold text-white">M</span>
          <span className="hidden font-semibold md:inline">Masar</span>
        </div>
        <div className="mt-4 space-y-1">
          {["Tableau de bord", "Commandes", "Livraisons", "Produits", "Clients", "Portefeuille", "Statistiques", "Paramètres"].map((n, idx) => (
            <div key={n} className={`hidden items-center gap-1.5 rounded-md px-2 py-1.5 md:flex ${idx === 0 ? "bg-primary-soft font-medium text-primary" : "text-muted-foreground"}`}>
              <span className="size-1.5 rounded-full bg-current opacity-40" />
              {n}
            </div>
          ))}
        </div>
      </div>
      {/* content */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold">Tableau de bord</p>
          <span className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-medium text-white">+ Commande</span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            ["Aujourd'hui", "23", ""],
            ["Livrées", "612", "var(--success)"],
            ["En transit", "87", "var(--info)"],
            ["COD", "94 200 DH", "var(--chart-5)"],
          ].map(([l, v, c]) => (
            <div key={l} className="rounded-lg border border-border bg-surface-2 p-2">
              <p className="truncate text-[9.5px] text-muted-foreground">{l}</p>
              <p className="mt-0.5 truncate text-[12.5px] font-semibold tnum" style={c ? { color: c } : undefined}>{v}</p>
            </div>
          ))}
        </div>
        {/* chart */}
        <div className="mt-3 rounded-lg border border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10.5px] font-medium text-muted-foreground">Commandes — 30 jours</p>
            <div className="flex gap-2 text-[9px]">
              <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-primary" />Livraisons</span>
              <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-error/60" />Échecs</span>
            </div>
          </div>
          <div className="relative flex h-20 items-end gap-1">
            {bars.map((h, idx) => (
              <div key={idx} className="group relative flex-1">
                <div className="w-full rounded-t-sm" style={{ height: `${h * 0.72}px`, background: "var(--primary)", opacity: 0.24 }} />
                <div className="-mt-2 w-full rounded-t-sm" style={{ height: `${h * 0.28}px`, background: "var(--primary)", opacity: 0.85 }} />
              </div>
            ))}
            <div className="pointer-events-none absolute inset-x-0 -bottom-4 flex justify-between text-[8px] text-faint tnum">
              {days.map((d) => <span key={d}>{d}</span>)}
            </div>
          </div>
        </div>
        {/* recent orders */}
        <div className="mt-5 rounded-lg border border-border">
          {[
            ["MSR-8X2K4Q", "Fatima Zahra B.", "Casablanca", "Livrée", "486 DH", "var(--success)"],
            ["MSR-3P9M1T", "Youssef E.", "Rabat", "En cours", "312 DH", "var(--info)"],
            ["MSR-7QW5R2", "Aya B.", "Marrakech", "Nouvelle", "1 250 DH", "var(--warning)"],
          ].map(([ref, name, city, st, amt, c], idx) => (
            <div key={ref} className={`flex items-center gap-2 px-2.5 py-1.5 ${idx < 2 ? "border-b border-border/70" : ""}`}>
              <span className="font-semibold tnum">{ref}</span>
              <span className="hidden text-muted-foreground sm:inline">{name}</span>
              <span className="hidden text-muted-foreground md:inline">· {city}</span>
              <span className="ms-auto rounded px-1.5 py-0.5 text-[9px] font-medium" style={{ background: `color-mix(in srgb, ${c} 12%, transparent)`, color: c }}>{st}</span>
              <span className="w-16 text-end font-medium tnum">{amt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CourierMock() {
  return (
    <div className="w-64 rounded-[2rem] border-[6px] border-[#1b1e27] bg-surface shadow-xl">
      <div className="flex items-center justify-between rounded-t-[1.6rem] bg-surface px-4 py-2">
        <span className="text-[10px] font-semibold">9:41</span>
        <span className="size-1.5 rounded-full bg-muted-foreground/40" />
      </div>
      <div className="px-3.5 pb-5">
        <p className="text-[13px] font-semibold">Bonjour, Youssef</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {[["À livrer", "6", "var(--info)"], ["Gains", "84 DH", "var(--chart-5)"]].map(([l, v, c]) => (
            <div key={l} className="rounded-xl border border-border p-2">
              <p className="text-[9px] text-muted-foreground">{l}</p>
              <p className="text-[13px] font-semibold tnum" style={{ color: c }}>{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-2.5 space-y-1.5">
          {[
            ["Fatima Zahra B.", "Maârif · 486 DH", "var(--success)"],
            ["Omar El F.", "Bourgogne · 312 DH", "var(--info)"],
          ].map(([n, meta, c]) => (
            <div key={n} className="rounded-xl border border-border p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10.5px] font-semibold">{n}</p>
                <span className="size-2 rounded-full" style={{ background: c }} />
              </div>
              <p className="mt-0.5 text-[9.5px] text-muted-foreground">{meta}</p>
              <div className="mt-1.5 grid grid-cols-2 gap-1">
                <span className="rounded-md bg-primary py-1 text-center text-[8.5px] font-semibold text-white">Appeler</span>
                <span className="rounded-md border border-border py-1 text-center text-[8.5px] font-medium text-muted-foreground">Itinéraire</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2.5 rounded-xl bg-primary py-2.5 text-center text-[11px] font-semibold text-white shadow-md">
          Marquer comme livré
        </div>
      </div>
    </div>
  );
}

export function PhoneMock() {
  return (
    <div className="w-72 rounded-[2rem] border-[6px] border-[#1b1e27] bg-surface shadow-xl">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-[10px] font-semibold">9:41</span>
        <span className="size-1.5 rounded-full bg-muted-foreground/40" />
      </div>
      <div className="px-3.5 pb-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold">Suivre votre colis</p>
          <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-soft px-1.5 py-0.5 text-[8px] font-medium text-success">
            <span className="size-1.5 rounded-full bg-success" />
            Live
          </span>
        </div>
        <div className="mt-2.5 flex gap-1.5">
          <span className="flex h-8 flex-1 items-center rounded-lg border border-border bg-surface-2 px-2.5 text-[9.5px] font-medium text-faint">MSR-8X2K4Q</span>
          <span className="flex h-8 items-center rounded-lg bg-primary px-2.5 text-[9.5px] font-semibold text-white shadow-sm">OK</span>
        </div>
        <div className="mt-3 rounded-2xl border border-success/30 bg-success-soft p-2.5">
          <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-success/80">Livraison</p>
          <p className="mt-1 text-[9.5px] font-medium text-success">Estimation : aujourd'hui, 14h–18h</p>
          <p className="mt-1 text-[15px] font-semibold text-success tnum">En cours de livraison</p>
        </div>
        <div className="mt-3 space-y-0">
          {[
            ["Colis pris en charge", true],
            ["En transit vers Casablanca", true],
            ["Chez le livreur Youssef", true],
            ["Livré", false],
          ].map(([label, done], idx, arr) => (
            <div key={String(label)} className="flex gap-2.5">
              <div className="flex flex-col items-center pt-0.5">
                <span className={`mt-0.5 size-2.5 rounded-full ${done ? "bg-success" : "border-2 border-border-strong bg-surface"}`} />
                {idx < arr.length - 1 && <span className={`mt-1 w-px flex-1 ${done ? "bg-success/40" : "bg-border"}`} />}
              </div>
              <p className={`pb-3 text-[10px] ${done ? "font-medium text-foreground" : "text-faint"}`}>{label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-primary/30 bg-primary-soft p-2.5 text-center shadow-sm">
          <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-primary/80">Votre code de livraison</p>
          <p className="mt-1 text-[15px] font-bold tracking-[0.25em] text-primary tnum">4 8 2 9 1</p>
        </div>
      </div>
    </div>
  );
}
