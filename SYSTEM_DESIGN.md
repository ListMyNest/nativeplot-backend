# ListMyNest — System Design Document

**Version:** 1.0 (as-built audit, April 2026)  
**Scope:** Monorepo `listmynest-frontend` + `listmynest-backend` aligned with PRD/TRD intent; notes where implementation differs from TRD.

---

## Section 1 — Architecture Overview

### Text architecture diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Users: Buyer (mostly anonymous) │ Seller │ Agent │ Admin                   │
└─────────────────────────────────────────────────────────────────────────────┘
                    │ HTTPS
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Next.js 14 (App Router) — PWA-capable SPA/SSR mix                          │
│  • Public pages: home, listings, property detail, schedule visit            │
│  • Dashboards: seller, agent, admin                                         │
│  • Client data: React Query (5 min stale), Zustand (seller/agent/admin auth)│
│  • Optional: PostHog / analytics hooks (enable per env)                     │
└─────────────────────────────────────────────────────────────────────────────┘
                    │ REST JSON  (NEXT_PUBLIC_API_BASE_URL → /v1)
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Spring Boot 3.2 REST API (stateless JWT)                                   │
│  • Controllers → Services → JPA Repositories                                │
│  • Flyway migrations on startup                                             │
│  • Schedulers: view-count flush, property lifecycle, visit reminders          │
└─────────────────────────────────────────────────────────────────────────────┘
         │                    │                         │
         ▼                    ▼                         ▼
┌──────────────┐   ┌────────────────────┐   ┌───────────────────────────────┐
│ PostgreSQL   │   │ Redis (optional)   │   │ Supabase Storage (photos)      │
│ (Supabase)   │   │ OTP, rate limits,  │   │ Signed URLs from backend       │
│              │   │ view dedupe/buffer │   │ + local /mock-upload dev path  │
└──────────────┘   └────────────────────┘   └───────────────────────────────┘

Third-party integrations (as wired in code / config):

| Integration | Role in product | Notes |
|---------------|-----------------|--------|
| **MSG91** | Seller/agent OTP SMS (legacy path) | Dev mode logs OTP if key blank |
| **Firebase Auth** | Optional buyer/agent/seller token path | `FirebaseConfig`; disabled if no service account |
| **Supabase** | Postgres + Storage | Primary persistence + images |
| **Redis / Upstash** | OTP payload, rate limits, view buffer keys | App tolerates Redis down with warnings |
| **Wati** | WhatsApp templates / inbound | `WhatsAppService`, webhook routes |
| **Nominatim (OSM)** | Geocode locality+city → lat/lng | `GeocodingService` (best-effort) |
| **Google Maps** | Config placeholder | Key in `application.yml`; map UX limited in UI |
| **FCM** | Agent push on new lead | `NotificationService`; skips if no token / Firebase off |
| **PostHog** | Product analytics | Mentioned in TRD; wire explicitly in frontend if desired |

### Technology choices (why / what problem)

| Layer | Choice | Problem solved |
|-------|--------|----------------|
| Frontend | Next.js App Router | File-based routing, image optimization, API routes for geocode proxy, deployable to Vercel |
| Styling | Tailwind | Fast responsive UI for mobile-first tier-3 users |
| Backend | Spring Boot | Typed enterprise API, security, validation, Flyway, mature Postgres support |
| DB | PostgreSQL | Relational integrity, JSON-free core schema, Supabase managed ops |
| Cache | Redis | Low-latency OTP + rate limiting + amortized view writes |
| Storage | Supabase Storage | Large binary offload; signed reads for private buckets |
| Auth | JWT | Stateless horizontal scale; role encoded in claims |

**TRD variance (important):** TRD describes **Redis-backed listing cache** and **SSR/SSG** for homepage; current code relies primarily on **Postgres queries per request** and **client-side React Query caching** for the home feed, not Redis entity cache for listings.

---

## Section 2 — Database Design

### Tables (Flyway V1–V16)

| Table | Purpose |
|-------|---------|
| **agents** | Field agents: cities served, WhatsApp routing, FCM token, active flag |
| **sellers** | Property owners; phone unique; password hash (V15) for login |
| **properties** | Core listing: pricing, geo, lifecycle status, FK to agent & seller |
| **property_photos** | Ordered images; `storage_url`; primary flag |
| **leads** | Contact events (call, WA, visit request, save, notify, inbound WA) |
| **visits** | Scheduled site visits with status machine |
| **buyers** | Verified buyer phones (OTP path) for saved listings |
| **saved_listings** | Buyer ↔ property many-to-save |
| **admins** | Console operators; password hash (V13) |
| **admin_audit_log** | Admin actions for accountability (V10) |
| **(constraints via migrations)** | `ARCHIVED` status (V14), nullable lead property (V12), impersonation column (V11) |

### Key columns — `properties`

| Column | Meaning |
|--------|---------|
| `status` | `NEW` → seller draft / pending ops; `PENDING_REVIEW`; `ACTIVE` public; `PAUSED`; `SOLD` (shows 48h window when sold); `INACTIVE`; `ARCHIVED` |
| `verified` | Trust badge / gating for featured-style surfaces |
| `view_count` | Integer counter; incremented via Redis buffer + periodic flush + direct fallback |
| `last_activity_at` | Drives lifecycle scheduler (inactivity warnings / auto-pause) |
| `sold_at` | Enables “sold but visible briefly” behaviour for buyers |
| `lat` / `lng` | Map + OSM embed; may be filled by geocoding service |

### Indexes (V6 + inline)

Purpose: accelerate filters (`city`, `status`, `type`), time-based scans (`last_activity_at`, `visit_date`), and lead dashboards (`agent_id`, `created_at`, `buyer_phone`). Photo and saved-listing FK indexes support joins and cascades.

### Relationships (summary)

- `properties.agent_id` → `agents.id`; `properties.seller_id` → `sellers.id`
- `property_photos.property_id` → `properties.id` (cascade delete)
- `leads.property_id` → `properties`; `leads.agent_id` → `agents`; `leads.buyer_id` → `buyers`
- `visits.property_id` → `properties`; `visits.agent_id` → `agents`
- `saved_listings` unique (`buyer_id`, `property_id`)

### Property lifecycle (data flow)

1. **Seller POST** `/v1/properties` → row `NEW` or per `SellerPropertyService` rules (often pending/review path).
2. **Admin / ops** sets `PENDING_REVIEW` → `ACTIVE` after verification.
3. **Buyer engagement** updates `last_activity_at` on lead creation.
4. **`SOLD`**: `sold_at` set; public detail may remain visible ~48h per service rules.
5. **`PropertyLifecycleScheduler` (daily 08:00):** 30-day warn, 45-day inactive transition, sold-badge expiry archival path — implemented in `PropertyLifecycleJobService` (see that class for exact status transitions).

---

## Section 3 — API Design

Base path: **`/v1`**. Below: **method + path**, **caller**, **behaviour summary**.

### Auth (`/v1/auth`)

| Endpoint | Caller | Behaviour |
|----------|--------|-----------|
| POST `/auth/otp/send` | Public | MSG91 / dev OTP store in Redis |
| POST `/auth/otp/verify` | Public | Validates OTP; issues JWT if agent/seller phone known |
| POST `/auth/firebase/verify` | Public | Firebase ID token → JWT if mapped user |
| POST `/auth/password/login` | Public | Seller/agent password login |
| POST `/auth/seller/register` | Public | Self-serve seller + JWT |
| POST `/auth/token/refresh` | Bearer | Rotates JWT |

### Properties (public + seller)

| Endpoint | Caller | Behaviour |
|----------|--------|-----------|
| GET `/properties/featured` | Public | Active + verified page |
| GET `/properties` | Public | Filtered active listings |
| GET `/properties/{id}` | Public | Detail when publicly visible |
| POST `/properties/{id}/view` | Public | Deduped view analytics |
| POST `/properties` | Seller JWT | Creates listing |

### Photos (`/v1/properties/{propertyId}/photos`)

| Endpoint | Caller | Behaviour |
|----------|--------|-----------|
| POST `.../upload-url` | Seller | Signed upload URL |
| POST `` | Seller | Register photo metadata |
| DELETE `.../{photoId}` | Seller | Remove photo |
| PATCH `.../{photoId}/primary` | Seller | Set primary |

### Leads & WhatsApp

| Endpoint | Caller | Behaviour |
|----------|--------|-----------|
| POST `/leads` | Public | Logs lead, dedupe window, rate limit, optional FCM |
| POST `/leads/whatsapp-inbound` | Public/Wati | Inbound webhook processing |
| GET `/leads` | Agent | Paginated lead board |
| GET `/leads/seller` | Seller | Seller-facing summary |
| GET `/whatsapp/link/{propertyId}` | Public | Returns wa.me link; may log lead |

### Visits

| Endpoint | Caller | Behaviour |
|----------|--------|-----------|
| POST `/visits` | Public | Schedules visit if property schedulable |
| GET `/visits` | Agent | Lists visits |
| PATCH `/visits/{id}/status` | Agent | Status machine |
| PATCH `/visits/{id}/reschedule` | Agent | Date/time change |

### Saved & buyers

| Endpoint | Caller | Behaviour |
|----------|--------|-----------|
| POST `/buyers/otp/send` | Public | Buyer OTP |
| POST `/buyers/otp/verify` | Public | Buyer JWT |
| POST `/saved` | Buyer | Save listing |
| DELETE `/saved/{propertyId}` | Buyer | Unsave |
| GET `/saved` | Buyer | List saved |

### Notify me

| POST `/notify-me` | Public | Capture interest |

### Agent & seller portals

| Prefix | Notes |
|--------|-------|
| `/v1/agents/me` (+ dashboard, status, FCM token) | Agent JWT |
| `/v1/sellers/me` (+ dashboard, listings, visits) | Seller JWT |

### Admin (`/v1/admin`)

Login/register, CRUD-ish agents/sellers, property listing moderation, visits listing, audit log, property detail by id, impersonation (`/v1/admin/impersonate/seller/{id}`).

### Config & root

| GET `/v1/config/site` | Public | Site phone hints |
| GET `/` | Public | API health/meta JSON |

### Local dev storage

| PUT/GET `/mock-upload/**` | Dev | Local file stand-in for Supabase |

---

## Section 4 — Authentication & Security

- **Buyer soft auth:** OTP to Redis (or in-memory fallback) → `buyers` row → short-lived **BUYER** JWT in session storage on frontend.
- **Seller/agent:** Password hash (BCrypt) + **SELLER** / **AGENT** JWT subject = user UUID; role claim `role`.
- **Admin:** Separate login; **ADMIN** JWT with shorter TTL (`jwt.admin-expiry-hours`).
- **JWT contents:** `sub` = user UUID; claim `role`; optional `impersonatedBy` admin UUID for seller impersonation tokens.
- **JwtAuthFilter:** Validates signature & expiry; populates `SecurityContext`.
- **Phone privacy:** Public DTOs do not expose seller numbers; leads route through agent.
- **Rate limiting:** Redis counters per session / phone keys in `LeadService` and OTP send path; failures log warnings when Redis absent.
- **Impersonation:** Admin issues short-lived seller token with audit log entry — treat as high privilege; rotate secrets in prod.

---

## Section 5 — Key Business Logic

1. **Contact capture:** WhatsApp link + lead row; schedule visit creates `visits`; notify-me + saved listings capture buyer intent after OTP.
2. **Agent assignment:** Property carries `agent_id` at creation (seller flow / admin seed) — not dynamic round-robin per click in current `LeadService` snippet (verify `SellerPropertyService` for assignment algorithm).
3. **Lifecycle:** Daily scheduler batches inactivity + sold visibility expiry.
4. **View counts:** Redis `view_dedupe:*` per session + `view_count:{uuid}` aggregate; `ViewCountFlushScheduler` flushes to DB; on Redis failure, direct SQL increment path in `PropertyService`.
5. **Lead dedupe:** `existsByPropertyIdAndSessionHashAndActionTypeAndCreatedAtAfter` within 1h returns `null` lead (skipped).

---

## Section 6 — Frontend Architecture

- **App Router:** File-based routes under `app/`; nested layouts in `app/layout.tsx`.
- **Rendering:** Most interactive surfaces are **client components** (`"use client"`) with hooks; homepage shell can be RSC wrapping client feeds.
- **State:** `lib/store` (Zustand) for seller/agent/admin; buyer session via `sessionStorage`.
- **API:** `lib/api.ts` central `apiFetch` with toast + token injection.
- **PWA:** `next-pwa` dependency exists in broader package setup; service worker behaviour depends on `next.config` / build profile — verify production build enables it.
- **Components:** `components/shared` (nav, hero), `components/home`, `components/property`, `components/layout` dashboards.

---

## Section 7 — Infrastructure & Deployment

| Target | Runs | Why |
|--------|------|-----|
| **Vercel** | Next.js | CDN + serverless functions for `app/api/*` routes |
| **Railway/Render/Fly** | Spring Boot JAR | Long-lived JVM, background schedulers |
| **Supabase** | Postgres + Storage | Managed relational + object store |
| **Upstash** | Redis TLS | Serverless Redis matching Spring Data Redis URL |
| **Env flow:** | Local `.env` loaded by Gradle `bootRun`; Vercel/Railway dashboards mirror keys | Never commit secrets |
| **Flyway** | Runs on Spring context refresh | Migrations versioned in `db/migration` |
| **CORS** | `CorsConfig` + `cors.allowed-origins` property | Allows browser origin for API |

---

## Section 8 — Performance Design

| Decision | Implemented? | Notes |
|----------|--------------|-------|
| Redis listing cache | Partial / TRD-level | **Not** a full featured-listings Redis cache; OTP + rate limits + views yes |
| View buffer + 60s flush | Yes | `ViewCountFlushScheduler` |
| Image compression 200KB | Yes (frontend) | `lib/imageCompress.ts` |
| `next/image` + lazy | Yes | `PropertyRemoteImage` etc. |
| Homepage 5 min API cache | Yes | React Query `staleTime` in provider + feed |
| 1000 concurrent users | Not load-tested | Bottlenecks likely Postgres connection pool, Redis TLS latency, Supabase rate limits — needs k6/Gatling before launch |

---

## Appendix — Inventory snapshot (automated approximations)

| Metric | Approx value |
|--------|----------------|
| Backend Java LOC | ~5,900 |
| Frontend TS/TSX LOC (excl. `node_modules`, `.next`) | ~8,350 |
| Flyway migrations | 16 |
| REST controllers | 17 Java classes |
| Next `app/` routes | ~24 TSX modules |

**PRD coverage (subjective):** core discovery, property detail, contact actions, visits, dashboards, admin moderation ≈ **65–75%** of Phase 1 PRD; advanced marketing automation, full PWA offline parity, deep analytics, and exhaustive TRD cache layer remain **partial**.

---

*Related artifacts:* `PRODUCTION_READINESS.md`, `ENHANCEMENTS.md`, `ARCHITECTURE.md`.
