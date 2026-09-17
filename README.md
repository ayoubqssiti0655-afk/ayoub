# Masar · مسار — The delivery OS for Moroccan e-commerce

A production-grade logistics SaaS platform connecting **merchants, couriers, customers and platform admins** around one COD-native delivery pipeline: order creation → confirmation → pickup → in transit → out for delivery → delivered → COD collection → settlement, with failed deliveries, retries and returns as first-class flows.

Four connected applications share one backend:

| App | Route | Audience |
|---|---|---|
| **Merchant platform** | `/app` | Store owners & staff — orders, catalog, wallet, analytics, integrations |
| **Courier app** | `/courier` | Drivers — mobile-first tour, call/navigate, OTP/signature/photo POD |
| **Admin console** | `/admin` | Masar HQ — merchants, couriers, zones, pricing, settlements, audit |
| **Customer tracking** | `/track` | Recipients — public, no login, OTP delivery code |
| **Marketing site** | `/` | Landing page (FR / AR / EN) |

## Stack

- **Next.js 15** (App Router, RSC, server actions) + **TypeScript** strict
- **Tailwind CSS v4** with a token-based design system (light *and* true dark theme)
- **Prisma 6** ORM with **PostgreSQL/Supabase**. Money is stored as Int centimes and enums remain app-level strings for portability.
- Auth: **JWT sessions** (`jose`) in httpOnly cookies + **RBAC** enforced in middleware *and* every API route (never client-side)
- **REST API** at `/api/v1` with Zod validation, rate limiting, API-key auth, typed error envelope
- **Recharts** analytics, **Leaflet + CARTO/OSM** maps (no API key), **cmdk** ⌘K search
- i18n: **French, Arabic (RTL first-class), English** — cookie-driven, ~470 keys per language, IBM Plex Sans Arabic for RTL

## Quick start

```bash
npm install
Copy-Item .env.example .env
# Set DATABASE_URL and DIRECT_URL in .env from Supabase.
npx prisma db push        # create/update the PostgreSQL schema
npm run db:seed           # realistic Moroccan demo data (~1,150 orders)
npm run dev               # http://localhost:3000
```

For Supabase, use the pooled connection string for `DATABASE_URL` (include `pgbouncer=true` when supplied) and the direct database connection string for `DIRECT_URL`. Keep `.env` private and never commit it.

Production: `npm run build && npm start`

### Demo accounts (password `Demo1234!`)

| Role | Email | Sees |
|---|---|---|
| Merchant | `merchant@masar.ma` | Zellige Store, Casablanca — full merchant platform |
| Admin | `admin@masar.ma` | Platform console |
| Courier | `courier@masar.ma` | Youssef El Amrani — Casablanca tour (others: `courier2@…courier10@masar.ma`) |

The login page has one-click demo-account fill. Try the full loop: confirm an order → mark ready → assign a courier → in the courier app: pickup → transit → out for delivery → deliver with the **OTP shown on the public tracking page** → watch the COD ledger and merchant wallet update → request a settlement → mark it paid as admin.

## Architecture

```
src/
  app/                    # routes: landing / app/ courier/ admin/ track/ api/v1/
  components/             # ui/ design system, layout/ shells, merchant/ admin/ courier/ landing/
  server/                 # db, orders.ts (state machine + COD ledger), actions, admin-actions,
                          # pricing.ts (zone engine), notifications.ts (provider abstraction + webhooks), audit
  lib/                    # auth (JWT), api (wrapper, errors, rate limit), format (MAD/phones/dates), constants
  i18n/                   # config, provider (client), server helper, dictionaries ar/fr/en
prisma/                   # schema.prisma, seed.ts (deterministic Moroccan dataset)
```

**Domain model** (26 tables): `User, Merchant, MerchantStaff, Courier, Customer, Region, City, Zone, Address, Product, Order, OrderItem, OrderEvent, Delivery, DeliveryAttempt, Return, Payment, CodTransaction, Settlement, Notification, Integration, ApiKey, Webhook, WebhookDelivery, AuditLog, Setting`.

**Order state machine** with guarded transitions (`lib/constants.ts`): `NEW → CONFIRMED → READY_FOR_PICKUP → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED`, plus `FAILED` (auto-retry up to 3 attempts, then return), `RETURNED`, `CANCELLED`.

**COD ledger**: every delivery posts `COD_COLLECTION (+)` and `DELIVERY_FEE (−)` transactions; returns post `RETURN_FEE`. Settlements aggregate AVAILABLE → SETTLED and move money to the merchant. All amounts are **integer centimes**.

## REST API (`/api/v1`)

Session-cookie auth for the UI; `Authorization: Bearer msk_live_…` API keys (created in *Integrations*) for merchants.

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/auth/login` · `/auth/logout` · `/auth/register` | rate-limited |
| GET | `/auth/me` | current identity |
| GET/POST | `/orders` | list with filters / create (API keys) |
| GET/PATCH | `/orders/:id` | detail / `{action: confirm\|ready\|cancel\|assign\|note}` |
| GET | `/products` · `/customers` · `/deliveries` · `/wallet` | paginated |
| GET | `/tracking/:reference` | **public**, rate-limited |
| GET | `/search?q=` | role-aware global search (⌘K) |
| GET/POST | `/notifications` | in-app inbox / mark read |
| PUT/POST | `/courier/deliveries/:id` | advance status / record attempt (POD, GPS, OTP) |
| GET | `/export/orders` | CSV (session) |

All responses: `{ data }` or `{ error: { code, message, details? } }`. Validation 422, auth 401, RBAC 403, rate-limit 429.

**Webhooks**: signed POSTs per merchant (`order.created/delivered/failed`, `return.completed`, `settlement.paid`) with delivery log + test ping in the Integrations page. Email/SMS/WhatsApp are provider interfaces (console driver) — plug in Resend/Twilio/WhatsApp Cloud API without touching call sites.

## Morocco-specific design

- 12 regions, 32 cities with **realistic per-city pricing** (Casa 25 DH → Dakhla 85 DH), remote-area multipliers, return fees, ETA per zone — all admin-editable without code changes
- Moroccan phone formats (`+212 6 12 34 56 78`), MAD currency with locale-aware rendering, Arabic month names via `ar-MA`
- Delivery failure taxonomy mirrors Moroccan COD reality: client injoignable, téléphone éteint, adresse incorrecte, reporté, refusé, hors zone
- Demo dataset: 8 merchants, 10 couriers, 142 customers, 36 products, ~1,150 orders over 90 days with attempts, returns and 33 settlements

## Advanced features (v2)

- **WhatsApp-first notifications** — templated customer messages (confirmation, out-for-delivery with OTP code, delivered, failed, paid) persisted to a notification log (`/admin/notifications`); provider is a one-file swap to WhatsApp Cloud API
- **Customer trust score** — anti-fraud scoring at order creation: typing a known phone shows a 0–100 reliability badge with history and one-click profile autofill (`server/trust.ts`)
- **Smart dispatch** — bulk auto-assign picking the best courier (city coverage → load → rating) + nearest-neighbour tour ordering from the courier's live position (`server/dispatch.ts`)
- **Courier cash reconciliation** — end-of-day cash declaration with deposit-receipt photo, expected-vs-declared comparison, admin verify/flag workflow (`server/cash.ts`, visible on the courier profile in admin)
- **Live GPS tracking (SSE)** — couriers beacon their position; the public tracking page streams it via Server-Sent Events onto a live map while the parcel is out for delivery
- **QR parcel labels** — printable label per order (QR → tracking page); the courier app scans labels with the native BarcodeDetector (manual reference fallback)
- **PWA + assignment alerts** — installable courier app (manifest, service worker, offline page) polling for new parcel assignments with system notifications
- **Prepaid by card (CMI simulation)** — customers can pay a COD parcel by card from the tracking page; payment provider abstraction in `server/payments.ts`
- **Exchange orders (تبادل)** — flag an order as an exchange with the old parcel's reference; the courier confirms pickup of the old parcel during delivery
- **Masar Insights** — deterministic analyst on the analytics page: success-rate trends, top failure reason, problem cities, COD ready to collect — localized in FR/AR/EN (`server/insights.ts`)

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | dev server |
| `npm run build` / `start` | production |
| `npm run db:push` | apply schema |
| `npm run db:seed` | seed demo data |
| `npm run db:reset` | wipe + reseed |
