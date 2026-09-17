import { getI18n } from "@/i18n/server";
import { LandingNav } from "@/components/landing/landing-nav";
import { DashboardMock, PhoneMock, CourierMock } from "@/components/landing/mocks";
import { Banknote as BanknoteIcon, Truck as TruckIcon, Smartphone as SmartphoneIcon, Undo2 as UndoIcon, Plug as PlugIcon, MapPin as MapPinIcon, Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function LandingPage() {
  const i = await getI18n();

  const features = [
    { icon: BanknoteIcon, title: i.t("landing.f1.title"), desc: i.t("landing.f1.desc"), accent: "var(--success)" },
    { icon: TruckIcon, title: i.t("landing.f2.title"), desc: i.t("landing.f2.desc"), accent: "var(--info)" },
    { icon: SmartphoneIcon, title: i.t("landing.f3.title"), desc: i.t("landing.f3.desc"), accent: "var(--primary)" },
    { icon: UndoIcon, title: i.t("landing.f4.title"), desc: i.t("landing.f4.desc"), accent: "var(--violet)" },
    { icon: PlugIcon, title: i.t("landing.f5.title"), desc: i.t("landing.f5.desc"), accent: "var(--chart-4)" },
    { icon: MapPinIcon, title: i.t("landing.f6.title"), desc: i.t("landing.f6.desc"), accent: "var(--error)" },
  ];

  const steps = [
    { n: "1", title: i.t("landing.how.s1.title"), desc: i.t("landing.how.s1.desc") },
    { n: "2", title: i.t("landing.how.s2.title"), desc: i.t("landing.how.s2.desc") },
    { n: "3", title: i.t("landing.how.s3.title"), desc: i.t("landing.how.s3.desc") },
  ];

  const plans = [
    {
      name: i.t("landing.p1.name"), desc: i.t("landing.p1.desc"), price: null,
      features: [i.t("landing.p1.f1"), i.t("landing.p1.f2"), i.t("landing.p1.f3"), i.t("landing.p1.f4")],
      cta: i.t("landing.pricing.cta"), featured: false,
    },
    {
      name: i.t("landing.p2.name"), desc: i.t("landing.p2.desc"), price: "499",
      features: [i.t("landing.p2.f1"), i.t("landing.p2.f2"), i.t("landing.p2.f3"), i.t("landing.p2.f4")],
      cta: i.t("landing.pricing.cta"), featured: true,
    },
    {
      name: i.t("landing.p3.name"), desc: i.t("landing.p3.desc"), price: null, custom: true,
      features: [i.t("landing.p3.f1"), i.t("landing.p3.f2"), i.t("landing.p3.f3"), i.t("landing.p3.f4")],
      cta: i.t("landing.pricing.contact"), featured: false,
    },
  ];

  const faqs = [1, 2, 3, 4, 5, 6].map((n) => ({ q: i.t(`landing.faq.q${n}`), a: i.t(`landing.faq.a${n}`) }));

  return (
    <div className="min-h-dvh bg-background">
      <LandingNav />

      {/* ── hero ── */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(720px 340px at 50% -80px, color-mix(in srgb, var(--primary) 9%, transparent), transparent), radial-gradient(480px 280px at 85% 20%, color-mix(in srgb, var(--info) 6%, transparent), transparent)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-16 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-[12px] font-medium text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              {i.t("landing.hero.badge")}
            </span>
            <h1 className="mt-5 text-balance text-[38px] font-semibold leading-[1.08] tracking-[-0.03em] md:text-[56px]">
              {i.t("landing.hero.title1")}
              <br />
              <span className="text-primary">{i.t("landing.hero.title2")}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-[15.5px] leading-7 text-muted-foreground md:text-[17px]">
              {i.t("landing.hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 md:gap-4">
              <a
                href="/register"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "px-7 text-[14.5px] shadow-[0_12px_30px_rgba(22,163,74,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(22,163,74,0.28)]"
                )}
              >
                {i.t("landing.hero.cta")}
              </a>
              <a
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "px-7 text-[14.5px] border-primary/30 bg-white/70 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-primary-soft/60"
                )}
              >
                {i.t("landing.hero.cta2")}
              </a>
            </div>
            <p className="mt-4 text-[12.5px] text-faint">{i.t("landing.hero.note")}</p>
          </div>

          <div className="relative mx-auto mt-14 max-w-4xl">
            <div className="rounded-2xl border border-border bg-surface shadow-lg">
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
                <span className="size-2.5 rounded-full bg-[#FF5F57]" />
                <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="size-2.5 rounded-full bg-[#28C840]" />
                <span className="mx-auto rounded-md bg-muted px-8 py-0.5 text-[10.5px] text-faint" dir="ltr">app.masar.ma</span>
              </div>
              <DashboardMock />
            </div>
          </div>
        </div>
      </section>

      {/* ── trust ── */}
      <section className="border-y border-border bg-surface/60 py-8">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-center text-[12px] font-medium uppercase tracking-[0.1em] text-faint">{i.t("landing.trust.title")}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {["Zellige Store", "Atlas Cosmetics", "Medina Threads", "Sahara Tech", "Riad Home", "Chaouen Wear"].map((n) => (
              <span key={n} className="text-[15px] font-semibold tracking-[-0.02em] text-faint">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── stats ── */}
      <section className="mx-auto max-w-6xl px-5 py-18 md:py-20">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-10">
          {[
            { v: "500+", l: i.t("landing.stats.merchants") },
            { v: "120 000+", l: i.t("landing.stats.parcels") },
            { v: "32", l: i.t("landing.stats.cities") },
            { v: "94 %", l: i.t("landing.stats.success") },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <p className="text-[32px] font-semibold tracking-[-0.03em] text-primary tnum md:text-[40px]">{s.v}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── features ── */}
      <section id="features" className="border-t border-border bg-surface/40 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="max-w-xl text-balance text-[28px] font-semibold leading-tight tracking-[-0.025em] md:text-[36px]">{i.t("landing.features.title")}</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-6 text-muted-foreground">{i.t("landing.features.subtitle")}</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="group rounded-2xl border border-border bg-surface p-5 shadow-xs transition-shadow hover:shadow-md">
                <div className="flex size-10 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${f.accent} 10%, transparent)` }}>
                  <f.icon className="size-5" style={{ color: f.accent }} strokeWidth={1.9} />
                </div>
                <h3 className="mt-4 text-[15.5px] font-semibold tracking-[-0.01em]">{f.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-6 text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── how it works ── */}
      <section id="how" className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="max-w-xl text-balance text-[28px] font-semibold leading-tight tracking-[-0.025em] md:text-[36px]">{i.t("landing.how.title")}</h2>
          <p className="mt-3 text-[15px] text-muted-foreground">{i.t("landing.how.subtitle")}</p>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((s, idx) => (
              <li key={s.n} className="relative rounded-2xl border border-border bg-surface p-6 shadow-xs">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-primary-foreground">{s.n}</span>
                <h3 className="mt-4 text-[16px] font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-6 text-muted-foreground">{s.desc}</p>
                {idx < steps.length - 1 && (
                  <span className="absolute -end-4 top-12 hidden text-border md:block" aria-hidden>
                    <svg width="28" height="12" viewBox="0 0 28 12" fill="none"><path d="M0 6h24m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.6" /></svg>
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── courier ── */}
      <section className="border-y border-border bg-surface/40 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
          <div>
            <h2 className="text-balance text-[28px] font-semibold leading-tight tracking-[-0.025em] md:text-[36px]">{i.t("landing.courier.title")}</h2>
            <p className="mt-3 max-w-lg text-[15px] leading-7 text-muted-foreground">{i.t("landing.courier.desc")}</p>
            <ul className="mt-6 space-y-3">
              {[i.t("landing.courier.p1"), i.t("landing.courier.p2"), i.t("landing.courier.p3")].map((p) => (
                <li key={p} className="flex items-center gap-2.5 text-[14px]">
                  <span className="flex size-5 items-center justify-center rounded-full bg-success-soft"><Check className="size-3 text-success" strokeWidth={3} /></span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center lg:justify-end">
            <CourierMock />
          </div>
        </div>
      </section>

      {/* ── tracking ── */}
      <section className="py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
          <div className="order-2 flex justify-center lg:order-1 lg:justify-start">
            <PhoneMock />
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-balance text-[28px] font-semibold leading-tight tracking-[-0.025em] md:text-[36px]">{i.t("landing.tracking.title")}</h2>
            <p className="mt-3 max-w-lg text-[15px] leading-7 text-muted-foreground">{i.t("landing.tracking.desc")}</p>
            <a href="/track" className={cn(buttonVariants({ variant: "outline" }), "mt-6")}>{i.t("tracking.cta")} →</a>
          </div>
        </div>
      </section>

      {/* ── analytics band ── */}
      <section className="border-y border-border bg-surface/40 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
          <div>
            <h2 className="text-balance text-[28px] font-semibold leading-tight tracking-[-0.025em] md:text-[36px]">{i.t("landing.analytics.title")}</h2>
            <p className="mt-3 max-w-lg text-[15px] leading-7 text-muted-foreground">{i.t("landing.analytics.desc")}</p>
          </div>
          <DashboardMock variant="analytics" />
        </div>
      </section>

      {/* ── integrations ── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5 text-center">
          <h2 className="text-balance text-[28px] font-semibold leading-tight tracking-[-0.025em] md:text-[36px]">{i.t("landing.integrations.title")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted-foreground">{i.t("landing.integrations.desc")}</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 md:gap-4">
            {[
              "Shopify",
              "WooCommerce",
              "PrestaShop",
              "REST API",
              "Webhooks",
            ].map((n) => (
              <span key={n} className="rounded-xl border border-border bg-surface px-5 py-3 text-[14px] font-semibold shadow-xs transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-sm">
                {n}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── pricing ── */}
      <section id="pricing" className="border-t border-border bg-surface/40 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-balance text-[28px] font-semibold leading-tight tracking-[-0.025em] md:text-[36px]">{i.t("landing.pricing.title")}</h2>
          <p className="mx-auto mt-3 max-w-md text-center text-[15px] text-muted-foreground">{i.t("landing.pricing.subtitle")}</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={cn(
                  "relative rounded-2xl border bg-surface p-6 shadow-xs",
                  p.featured ? "border-primary/50 shadow-md ring-1 ring-primary/20" : "border-border"
                )}
              >
                {p.featured && (
                  <span className="absolute -top-3 start-6 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground">
                    {i.t("landing.p2.name")}
                  </span>
                )}
                <h3 className="text-[16px] font-semibold">{p.name}</h3>
                <p className="mt-1 text-[13px] text-muted-foreground">{p.desc}</p>
                <p className="mt-4">
                  {p.custom ? (
                    <span className="text-[28px] font-semibold tracking-[-0.02em]">{i.t("landing.pricing.custom")}</span>
                  ) : (
                    <>
                      <span className="text-[36px] font-semibold tracking-[-0.03em] tnum">{p.price ?? "0"}</span>
                      <span className="text-[14px] text-muted-foreground"> DH{p.price ? i.t("landing.p.monthly") : ""}</span>
                    </>
                  )}
                </p>
                <ul className="mt-5 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13.5px] leading-5">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2.4} />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={p.custom ? "#faq" : "/register"}
                  className={cn(buttonVariants({ variant: p.featured ? "default" : "outline" }), "mt-6 w-full")}
                >
                  {p.cta}
                </a>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-[12px] text-faint">{i.t("landing.pricing.note")}</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-center text-balance text-[28px] font-semibold leading-tight tracking-[-0.025em] md:text-[36px]">{i.t("landing.faq.title")}</h2>
          <div className="mt-8 space-y-2.5">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-xl border border-border bg-surface px-4 shadow-xs [&[open]]:shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-[14.5px] font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <svg className="size-4 shrink-0 text-faint transition-transform group-open:rotate-45" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M8 2v12M2 8h12" strokeLinecap="round" />
                  </svg>
                </summary>
                <p className="pb-4 text-[13.5px] leading-6 text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-5 pb-20">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary-soft via-surface to-surface p-10 text-center shadow-md md:p-16">
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(420px 200px at 50% 0%, color-mix(in srgb, var(--primary) 12%, transparent), transparent)" }} />
          <h2 className="relative text-balance text-[28px] font-semibold leading-tight tracking-[-0.025em] md:text-[36px]">{i.t("landing.cta.title")}</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-[15px] text-muted-foreground">{i.t("landing.cta.subtitle")}</p>
          <a href="/register" className={cn(buttonVariants({ size: "lg" }), "relative mt-7 px-7 text-[14.5px]")}>{i.t("landing.cta.button")}</a>
        </div>
      </section>

      {/* ── footer ── */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <span className="text-[17px] font-semibold tracking-[-0.02em]">Masar <span className="text-faint">· مسار</span></span>
            <p className="mt-2 max-w-xs text-[13px] leading-5 text-muted-foreground">{i.t("landing.hero.title2")}.</p>
            <p className="mt-3 text-[12px] text-faint">{i.t("landing.footer.madeIn")}</p>
          </div>
          {[
            { title: i.t("landing.footer.product"), links: [["#features", i.t("landing.nav.features")], ["#how", i.t("landing.nav.how")], ["#pricing", i.t("landing.nav.pricing")], ["/track", i.t("tracking.title")]] },
            { title: i.t("landing.footer.company"), links: [["/login", i.t("landing.nav.signIn")], ["/register", i.t("landing.nav.start")], ["/admin", i.t("auth.adminConsole")]] },
            { title: i.t("landing.footer.legal"), links: [["#", "CGU"], ["#", "Confidentialité"], ["#", "Cookies"]] },
          ].map((col) => (
            <div key={col.title}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.07em] text-faint">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map(([href, label]) => (
                  <li key={label}><a href={href} className="text-[13.5px] text-muted-foreground hover:text-foreground">{label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border py-4">
          <p className="text-center text-[12px] text-faint">{i.t("landing.footer.rights")}</p>
        </div>
      </footer>
    </div>
  );
}
