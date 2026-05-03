# ListMyNest — Real Estate Discovery Platform

> **Phase 1 MVP · Web-First · Tier-3 Indian Real Estate Market**
>
> A mobile-first, web-based real estate discovery and connection platform for Tier-3 Indian cities (Bidar, Humnabad, Basavakalyan, Bhalki, Aurad — Karnataka). Buyers find verified local properties and connect with an agent in under 60 seconds — via call, WhatsApp, or a scheduled site visit — **without creating an account or downloading an app.**

---

## Quick start (run locally)

### Frontend

```bash
cd listmynest-frontend/listmynest-frontend
npm install
copy .env.example .env.local
npm run dev
```

- Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` (default is `http://localhost:8080/v1`).
- If you use Supabase signed image URLs, set `NEXT_PUBLIC_SUPABASE_URL` so Next Image can load remote images.

## Environment variables (frontend)

Create `listmynest-frontend/listmynest-frontend/.env.local` from `.env.example`.

- **Required**
  - `NEXT_PUBLIC_API_BASE_URL`: Backend base URL ending with `/v1` (e.g. `http://localhost:8080/v1`)
- **Recommended**
  - `NEXT_PUBLIC_SUPABASE_URL`: Used to allow remote images from your Supabase Storage domain
- **Optional**
  - `NEXT_PUBLIC_ENQUIRY_PHONE`: Phone used for homepage Call/WhatsApp CTAs
  - `NEXT_PUBLIC_FALLBACK_BUYER_CONTACT_PHONE`: Used if `NEXT_PUBLIC_ENQUIRY_PHONE` is not set
  - `NEXT_PUBLIC_FIREBASE_*`: Public Firebase web config (only needed if you enable phone auth UI)

## Bundle analysis

Run:

```bash
npm run analyze
```

This generates bundle analyzer output (enabled via `ANALYZE=true`).

### Backend

```bash
cd listmynest-backend/listmynest-backend
./gradlew bootRun
```

Default admin (seeded if no admin exists): `admin@listmynest.in` / `Admin@123`.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Repository Structure](#repository-structure)
5. [Database Schema](#database-schema)
6. [Component Build Order](#component-build-order)
7. [Backend Components](#backend-components)
8. [Frontend Components](#frontend-components)
9. [Third-Party Integrations](#third-party-integrations)
10. [API Reference](#api-reference)
11. [Environment Variables](#environment-variables)
12. [Authentication Model](#authentication-model)
13. [Business Rules & Constraints](#business-rules--constraints)
14. [Testing Requirements](#testing-requirements)
15. [Deployment](#deployment)

---

## Project Overview

### Core Value Proposition
Buyers browse and contact agents in **3 taps or fewer**, with zero login friction. All buyer-agent contact is routed through an assigned agent — sellers never see buyer contact details, buyers never see seller phone numbers.

### Target Users
| Persona | Role | Key Need |
|---|---|---|
| Raju Patil (Buyer) | Govt. employee, 34, Bidar | Find 2BHK under ₹20L, see photos, contact without pressure |
| Ramesh Kulkarni (Seller) | Plot owner, 52, Humnabad | Reach serious buyers, control listing, track enquiries |
| Suresh Patil (Agent) | Local agent, 28, manages 15+ listings | All leads in one place, visit schedule, WhatsApp routing |

### Phase 1 Non-Negotiables (Anti-Goals)
- ❌ No online payments or booking
- ❌ No buyer KYC or identity verification for browsing
- ❌ No in-app chat
- ❌ No buyer-to-seller direct contact (always agent-routed)
- ❌ No native iOS/Android app (PWA only)

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | Next.js (App Router) + Tailwind CSS + PWA (next-pwa) | Next 14.2.3, React 18.3.1 |
| **Backend** | Java + Spring Boot | Java 17, Spring Boot 3.2.3 |
| **Database** | PostgreSQL (Supabase hosted) | Latest |
| **Cache** | Redis (Upstash) | Latest |
| **File Storage** | Supabase Storage (S3-backed, CDN-served) | Latest |
| **WhatsApp** | Wati.io (INR billing, pre-approved templates, webhook) | Latest |
| **OTP / SMS** | Firebase Phone Auth (web) or MSG91 | Firebase for seller/agent OTP on web; MSG91 supported as fallback |
| **Maps** | Google Maps Platform (JS API + Places + Geocoding) | Latest |
| **Analytics** | PostHog (anonymous event tracking) | posthog-js 1.121.0 |
| **Push Alerts** | Firebase Cloud Messaging (FCM) — Java Admin SDK | firebase-admin 9.2.0 |
| **Frontend Hosting** | Vercel (auto-deploy, CDN, SSR) | Latest |
| **Backend Hosting** | Railway or Render (Spring Boot JAR) | Latest |
| **DNS + CDN** | Cloudflare | Free tier |
| **State Management** | Zustand | 4.5.2 |
| **Data Fetching** | TanStack React Query | 5.32.0 |
| **DB Migrations** | Flyway | Bundled with Spring Boot |

---

## Architecture

```
CLIENT (Next.js PWA)
       │
       │ HTTPS / REST
       ▼
API LAYER (Spring Boot 3.x — Railway/Render)
       │                    │
       ▼                    ▼
PostgreSQL              Redis (Upstash)
(Supabase)              - OTP hashes
- All relational data   - Rate limiting
                        - City/listing cache
                        - View count buffer
       │
       ▼
Supabase Storage (S3-backed CDN)
- Property photos

Third-Party Services:
- Wati.io       → WhatsApp inbound webhook + outbound templates
- MSG91         → OTP/SMS delivery
- Google Maps   → Autocomplete + Geocoding
- Firebase FCM  → Push notifications to agents
- PostHog       → Anonymous analytics
```

### Key Architecture Decisions
| Decision | Choice | Reason |
|---|---|---|
| API Style | REST over HTTPS | Simple, well-understood, easy to test |
| Auth Strategy | JWT (stateless) | Buyers need no auth for browsing; soft OTP for save/notify-me only |
| DB Access | Spring Data JPA + Hibernate | Standard ORM, thin controllers |
| File Upload | Signed URL (direct to Supabase) | Backend never handles file bytes |
| Camera Enforcement | `accept='image/*' capture='environment'` | Forces device camera on mobile |
| Frontend Rendering | SSR + SSG via Next.js | SSR for property detail (SEO), SSG for homepage |
| Tracking | PostHog JS snippet | Zero backend work, DPDP Act compliant |

---

## Repository Structure

### Backend (`com.listmynest`)
```
com.listmynest/
├── controller/
│   ├── PropertyController.java
│   ├── LeadController.java
│   ├── VisitController.java
│   ├── AuthController.java               # seller/agent OTP
│   ├── BuyerAuthController.java          # buyer soft OTP (save/notify-me)
│   ├── SavedListingController.java
│   ├── NotifyMeController.java
│   ├── AgentController.java
│   ├── SellerController.java
│   ├── AdminController.java
│   └── AdminImpersonationController.java
├── service/
│   ├── PropertyService.java
│   ├── LeadService.java
│   ├── VisitService.java
│   ├── AuthService.java                  # seller/agent OTP + JWT
│   ├── BuyerAuthService.java             # buyer OTP + buyer token
│   ├── SavedListingService.java
│   ├── NotifyMeService.java
│   ├── WhatsAppService.java              # Wati REST client + webhook handler
│   ├── StorageService.java
│   ├── NotificationService.java          # FCM
│   ├── GpsValidationService.java         # Photo GPS proximity check
│   ├── AgentRoutingService.java
│   ├── AdminService.java                 # admin CRUD + impersonation token issue
│   └── AdminAuditService.java            # write to admin_audit_log
├── repository/
│   ├── PropertyRepository.java
│   ├── LeadRepository.java
│   ├── VisitRepository.java
│   ├── AgentRepository.java
│   ├── SellerRepository.java
│   ├── BuyerRepository.java
│   ├── SavedListingRepository.java
│   ├── AdminRepository.java
│   └── AdminAuditLogRepository.java
├── model/                                # JPA @Entity classes
├── dto/                                  # Request/Response DTOs (records)
├── config/
│   ├── SecurityConfig.java
│   ├── CorsConfig.java
│   ├── RedisConfig.java
│   └── OpenApiConfig.java
├── exception/
│   ├── GlobalExceptionHandler.java
│   └── AppException.java
└── scheduler/
    ├── VisitReminderScheduler.java
    ├── PropertyLifecycleScheduler.java   # 30-day warn, 45-day auto-inactive
    └── ViewCountFlushScheduler.java      # Batch view count flush to DB
```

### Frontend (`app/`)
```
app/
├── layout.tsx                            # Root layout: fonts, PWA meta, nav
├── page.tsx                              # Homepage (SSG, revalidate: 300s)
├── listings/
│   └── page.tsx                          # Listing page (SSR, city/type filter)
├── property/
│   └── [id]/
│       └── page.tsx                      # Property detail (SSR for SEO)
├── saved/
│   └── page.tsx                          # Saved listings (CSR, buyer token required)
├── seller/
│   ├── login/page.tsx
│   ├── dashboard/page.tsx
│   └── add-listing/page.tsx
├── agent/
│   ├── login/page.tsx
│   └── dashboard/page.tsx
├── admin/
│   ├── login/page.tsx
│   ├── dashboard/page.tsx
│   ├── listings/page.tsx
│   ├── agents/page.tsx
│   ├── sellers/page.tsx
│   └── buyers/page.tsx
├── schedule-visit/
│   └── [propertyId]/page.tsx             # Visit scheduler (buyer_phone REQUIRED)
└── api/
    ├── revalidate/route.ts
    └── wati-webhook/route.ts             # Wati inbound webhook proxy (optional edge fn)
```

---

## Database Schema

> All tables use UUID primary keys. Timestamps in UTC. Enums enforced at DB level.
> Base URL: `https://api.listmynest.in/v1`

### Tables Overview
| Table | Purpose |
|---|---|
| `properties` | Core listing data |
| `property_photos` | Photos linked to listings, with GPS metadata |
| `agents` | Agent profiles, assigned cities, FCM token |
| `sellers` | Seller profiles (phone-only identity) |
| `buyers` | Verified buyers (OTP-verified phone) |
| `saved_listings` | Buyer ↔ Property save records |
| `leads` | All contact actions: CALL, WHATSAPP, VISIT_REQUEST, NOTIFY_ME, SAVE |
| `visits` | Scheduled site visits with status lifecycle |
| `admins` | Admin users |
| `admin_audit_log` | Every admin action logged |

### Property Status Lifecycle
```
NEW → PENDING_REVIEW → ACTIVE → PAUSED / SOLD / INACTIVE
                                      ↑
                              Agent verifies listing
```

| Status | Who Sets | Trigger | Buyer Visibility |
|---|---|---|---|
| `NEW` | System | Seller submits form | Hidden |
| `PENDING_REVIEW` | System | Awaits agent verification | Hidden |
| `ACTIVE` | Agent | Agent verifies | Visible + Verified badge |
| `PAUSED` | Seller | Seller pauses | Hidden |
| `SOLD` | Seller/System | Marked as sold | Sold badge 7 days, then hidden |
| `INACTIVE` | System | 45 days no response | Hidden; seller can reactivate |

### Redis Keys
| Key | TTL | Purpose |
|---|---|---|
| `otp:{phone}` | 300s | Seller/Agent OTP hash |
| `buyer_otp:{phone}` | 300s | Buyer soft OTP hash |
| `prop_inactive_warn:{property_id}` | 1,296,000s (15d) | 30→45 day lifecycle |
| `view_count:{property_id}` | 60s | View count buffer (batch flush) |
| `otp_send_count:{phone}` | 3600s | OTP send rate limit |
| `wa_rl:{session}:{prop_id}` | 3600s | WhatsApp click rate limit |
| `call_rl:{session}:{prop_id}` | 3600s | Call click rate limit |
| `visit_rl:{session}` | 86400s | Visit request rate limit |

---

## Component Build Order

Build in this exact sequence to respect dependencies:

### Phase A — Foundation (Build First)
1. **Database + Migrations** — Flyway scripts V1–V11
2. **Entity Models** — JPA `@Entity` classes for all tables
3. **Repositories** — Spring Data JPA repository interfaces
4. **Redis Config** — OTP, rate limiting, cache setup
5. **Security Config** — Spring Security, JWT filter, CORS

### Phase B — Auth Layer
6. **AuthService + AuthController** — Seller/agent OTP send + verify, JWT issue
7. **BuyerAuthService + BuyerAuthController** — Buyer soft OTP, buyer_token issue

### Phase C — Core Property APIs
8. **PropertyService + PropertyController** — CRUD, status transitions, view count
9. **AgentRoutingService** — Round-robin assignment, fallback on inactive agent
10. **StorageService** — Supabase signed URL generation for photo upload
11. **GpsValidationService** — Haversine distance check on photo GPS (soft flag >500m)
12. **PhotoEndpoints** — upload-url, register metadata, delete, set-primary

### Phase D — Lead & Visit APIs
13. **LeadService + LeadController** — Log CALL/WHATSAPP/VISIT_REQUEST/NOTIFY_ME/SAVE
14. **WhatsAppService** — Wati webhook handler (phone capture) + template sender
15. **VisitService + VisitController** — Schedule, update status, trigger post-visit WA template
16. **NotifyMeService + NotifyMeController** — Register buyer for city broadcast

### Phase E — Buyer Features
17. **SavedListingService + SavedListingController** — Save/unsave/list with buyer token auth
18. **BuyerRepository** — Find-or-create buyer on OTP verify

### Phase F — Admin Layer
19. **AdminService + AdminController** — Full CRUD on listings/agents/sellers/buyers
20. **AdminImpersonationController** — Issue scoped seller JWT for listing on behalf of seller
21. **AdminAuditService** — Write to `admin_audit_log` on every admin action

### Phase G — Schedulers
22. **PropertyLifecycleScheduler** — Daily 8AM: 30-day warn, 45-day auto-inactive, 48h sold badge expiry
23. **ViewCountFlushScheduler** — Flush Redis view count buffer to DB every 60s
24. **VisitReminderScheduler** — FCM push 1hr before scheduled visit

### Phase H — Frontend (Buyer-Facing)
25. **Homepage** (`/`) — SSG, city chips, search bar, featured listings grid
26. **Listings Page** (`/listings`) — SSR, filter bar, property cards grid
27. **Property Detail Page** (`/property/[id]`) — SSR, carousel, specs, map, sticky CTA bar
28. **Schedule Visit Sheet** (`/schedule-visit/[propertyId]`) — Date picker, time slots, phone REQUIRED
29. **Notify Me Bottom Sheet** — Session trigger (3+ views, no contact action)
30. **Save Button + OTP Sheet** — Trigger buyer OTP flow on first save attempt
31. **Saved Listings Page** (`/saved`) — CSR, buyer token required

### Phase I — Frontend (Seller)
32. **Seller Login** (`/seller/login`) — OTP flow
33. **Seller Dashboard** (`/seller/dashboard`) — Stats, listings, enquiries feed
34. **Add Property Form** (`/seller/add-listing`) — Camera-only photo upload, listing form

### Phase J — Frontend (Agent)
35. **Agent Login** (`/agent/login`) — OTP flow
36. **Agent Dashboard** (`/agent/dashboard`) — Lead feed, visit schedule, status actions

### Phase K — Frontend (Admin)
37. **Admin Login** (`/admin/login`) — Email+password or OTP
38. **Admin Dashboard** (`/admin/dashboard`) — Overview stats
39. **Admin Listings** (`/admin/listings`) — All statuses, force-activate, reject
40. **Admin Agents** (`/admin/agents`) — Create, assign cities, toggle active
41. **Admin Sellers** (`/admin/sellers`) — Create seller, impersonate for listing
42. **Admin Buyers** (`/admin/buyers`) — View verified buyers, saved listings

### Phase L — PWA + Performance
43. **PWA Setup** — `next-pwa` + Workbox service worker, offline fallback
44. **PostHog Analytics** — Anonymous event tracking (no localStorage)
45. **Lighthouse + Performance Audit** — Target: score >80 on every deploy

---

## Backend Components

### PropertyLifecycleScheduler
Runs daily at 8AM (`@Scheduled(cron = '0 0 8 * * *')`):
- **Day 30**: Send SMS to seller if no activity. Store Redis key `prop_inactive_warn:{id}` (TTL 15 days).
- **Day 45**: Auto-set status to `INACTIVE`. Send SMS to seller.
- **Sold badge expiry (48h)**: Set status to `ARCHIVED` after 48 hours of `SOLD`.

### WhatsAppService — Wati Webhook Handler
Called by `POST /leads/whatsapp-inbound` (public, Wati webhook):
1. Extract `waId` → format as `+91XXXXXXXXXX`
2. Find or create buyer record
3. Match to most recent unresolved WA lead for that agent number
4. Capture buyer phone against lead
5. If reply is `1/2/3`: classify intent as `HOT/WARM/COLD`
6. Push intent update to agent via FCM

### VisitService — Post-Visit Template Trigger
When agent marks visit as `VISITED` and `post_visit_wa_sent = false`:
- Call `WhatsAppService.sendPostVisitTemplate(buyerPhone, propertyTitle, city)`
- Template name: `post_visit_feedback`
- Set `post_visit_wa_sent = true`

**Wati template message:**
> *Hi! Hope your visit to [Property Name] in Bidar went well. Reply 1 — Interested · Reply 2 — Need more options · Reply 3 — Not for me*

### GpsValidationService
- If GPS missing → soft flag photo (`gps_flagged = true`)
- If GPS > 500m from property `lat/lng` → soft flag (NOT auto-reject)
- Agent reviews GPS-flagged photos in admin review queue

### BuyerAuthService — Soft OTP
- `sendBuyerOtp(phone)` → 6-digit OTP via MSG91, hash stored in Redis (`buyer_otp:{phone}`, TTL 300s)
- `verifyBuyerOtp(phone, otp)` → validate hash → find-or-create buyer → issue `buyer_token` (JWT, 24h, role=BUYER)
- Token scope: `GET/POST/DELETE /saved` only

### AgentRoutingService
- **Assignment**: Round-robin among active agents for listing's city at creation time
- **Fallback**: If assigned agent is inactive → auto-reassign to next active agent in same city
- **Re-assignment trigger**: Agent misses 3 consecutive leads → removed from rotation

### Anti-Bypass Enforcement (Critical)
- `GET /properties` and `GET /properties/{id}` **NEVER** return `seller_phone` or `agent_phone`
- Only `GET /whatsapp/link/{propertyId}` returns agent WA number — and only after logging the lead
- `Call Now` button dials assigned agent's number, NOT seller's
- WhatsApp link opens to agent's WhatsApp number as recipient

---

## Frontend Components

### 4-Moment Contact Capture Strategy
Zero-friction phone number acquisition across the buyer journey:

| Moment | Trigger | Friction | Platform Gets |
|---|---|---|---|
| **1 — WhatsApp Tap** | Buyer taps WhatsApp CTA | Zero | Phone, timestamp, property ID, city (via Wati webhook) |
| **2 — Schedule Visit** | Phone required on visit form | 10 seconds | Verified phone of highest-intent buyers |
| **3 — Post-Visit WA** | Agent marks visit complete | Zero | Confirmed active WA + intent signal (HOT/WARM/COLD) |
| **4 — Notify Me (3+ views)** | Bottom sheet after 3 views with no contact | One OTP | Phone of highest re-marketing value segment |

### Notify Me Trigger Logic
```typescript
// Show bottom sheet once per session when:
// - viewCount >= 3
// - No contact action (call/wa/visit/save) yet in session
// - Not already shown this session
// Session view count stored in sessionStorage (not Redux)
```

### Save Button + OTP Flow
1. Buyer taps save → check `buyerToken` in store
2. If no token → show OTP bottom sheet → verify → store `buyer_token` in `sessionStorage`
3. Auto-complete the pending save action after verification

### Camera-Only Photo Upload
```html
<input
  type="file"
  accept="image/*"
  capture="environment"   <!-- rear camera on mobile, gallery on desktop — acceptable -->
  multiple
/>
```
GPS EXIF extracted client-side via `exifr` for UX preview, but backend always re-validates.

### Property Card Fields (Public)
- Title, type, city, locality, price range (min–max in ₹ Lakh — NOT exact price)
- Area (sqft), configuration (BHK), bathrooms, possession status
- Verified badge, photo count, view count
- **Never included**: seller phone, agent phone

---

## Third-Party Integrations

### Wati.io (WhatsApp)
| Flow | Type | Details |
|---|---|---|
| Click-to-chat | Outbound link | `https://wa.me/{AGENT_NUMBER}?text={URL_ENCODED_MSG}` |
| Post-visit feedback | Outbound template | Template: `post_visit_feedback`, params: `property_name`, `city` |
| Buyer phone capture | Inbound webhook | `POST /leads/whatsapp-inbound` — event: `message:received` |
| Notify Me broadcasts | Broadcast segment | Group: `notify_{city}`, template: `new_listings_weekly` |

**Apply for `post_visit_feedback` template early** — Wati approval takes 24–72 hours.

### MSG91 (OTP/SMS)
```
POST https://api.msg91.com/api/v5/otp
Sender ID: LSTNEST
OTP length: 6 digits
Expiry: 5 minutes
Rate limit: Max 3 send attempts per phone per hour (enforced in Redis)
```

### Google Maps
- **Address Autocomplete** — listing form (frontend, Places API)
- **Geocoding** — property creation (backend, converts address to lat/lng)
- **Static map embed** — property detail page shows **area-level pin only**, NOT exact address

### Firebase FCM
Used for: new lead alert to agent, visit reminder (1hr before), intent update (after Wati reply).
Fallback: agent dashboard polling every 30 seconds.

### PostHog Analytics
```javascript
posthog.init('KEY', {
  persistence: 'memory'  // No localStorage — DPDP Act compliant
})
// Events: property_view, call_click, wa_click, visit_request,
//         save_attempt, otp_sheet_shown, otp_verified,
//         notify_me_shown, notify_me_submitted, notify_me_dismissed,
//         city_filter
```

---

## API Reference

Base URL: `https://api.listmynest.in/v1`

### Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/otp/send` | Public | Send OTP to seller/agent phone |
| POST | `/auth/otp/verify` | Public | Verify OTP → JWT + role + user_id |
| POST | `/auth/token/refresh` | Bearer JWT | Refresh JWT |
| POST | `/buyers/otp/send` | Public | Send buyer soft OTP |
| POST | `/buyers/otp/verify` | Public | Verify → buyer_token + buyer_id |

### Properties
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/properties` | Public | List with filters: city, type, price_min, price_max |
| GET | `/properties/{id}` | Public | Full property detail |
| GET | `/properties/featured` | Public | Active + Verified, sorted by views |
| GET | `/properties/search` | Public | Keyword search: q, city |
| POST | `/properties` | Seller JWT | Create listing → enters PENDING_REVIEW |
| PUT | `/properties/{id}` | Seller JWT | Update own listing |
| PATCH | `/properties/{id}/status` | Agent/Seller JWT | Update status |
| PATCH | `/properties/{id}/sold` | Seller JWT | Mark as sold |
| POST | `/properties/{id}/view` | Public | Record anonymous view |

### Photos
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/properties/{id}/photos/upload-url` | Seller JWT | Get signed Supabase upload URL |
| POST | `/properties/{id}/photos` | Seller JWT | Register uploaded photo metadata |
| DELETE | `/properties/{id}/photos/{photoId}` | Seller JWT | Delete photo |
| PATCH | `/properties/{id}/photos/{photoId}/primary` | Seller JWT | Set primary photo |

### Leads
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/leads` | Public | Log CALL / WHATSAPP / VISIT_REQUEST / NOTIFY_ME |
| POST | `/leads/whatsapp-inbound` | Webhook secret | Wati inbound webhook — captures buyer WA number |
| GET | `/leads` | Agent JWT | All leads for agent |
| GET | `/leads/seller` | Seller JWT | Enquiry summary for seller's listings |

### Visits
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/visits` | Public | Schedule visit — **buyer_phone REQUIRED** |
| GET | `/visits` | Agent JWT | Visits for agent |
| PATCH | `/visits/{id}/status` | Agent JWT | Update status — triggers Wati template on VISITED |
| PATCH | `/visits/{id}/reschedule` | Agent JWT | Reschedule visit |

### Saved Listings
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/saved` | Buyer token | Save a property |
| DELETE | `/saved/{propertyId}` | Buyer token | Remove saved |
| GET | `/saved` | Buyer token | Get all saved for buyer |

### Admin
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/admin/auth/login` | — | Admin login (email+password or OTP) → Admin JWT (8h) |
| GET | `/admin/properties` | Admin JWT | All properties, all statuses |
| PATCH | `/admin/properties/{id}/status` | Admin JWT | Force-set any status |
| GET | `/admin/agents` | Admin JWT | All agents with stats |
| POST | `/admin/agents` | Admin JWT | Create agent |
| PATCH | `/admin/agents/{id}` | Admin JWT | Edit agent |
| GET | `/admin/sellers` | Admin JWT | All sellers |
| POST | `/admin/sellers` | Admin JWT | Create seller |
| POST | `/admin/impersonate/seller/{id}` | Admin JWT | Issue scoped seller JWT + log IMPERSONATION_START |
| GET | `/admin/buyers` | Admin JWT | Verified buyers |
| GET | `/admin/audit-log` | Admin JWT | Admin action history |

---

## Environment Variables

### Backend (Railway / Render)
```env
DATABASE_URL=postgresql://postgres:{password}@db.supabase.co:5432/postgres
REDIS_URL=rediss://:{password}@upstash-redis-host:6380
JWT_SECRET=your-256-bit-secret-key
MSG91_AUTH_KEY=your-msg91-key
MSG91_SENDER_ID=LSTNEST
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
GOOGLE_MAPS_API_KEY=your-google-maps-key
FIREBASE_SERVICE_ACCOUNT_JSON={...json...}
WATI_API_TOKEN=your-wati-token
WATI_BASE_URL=https://live-server.wati.io
WATI_WEBHOOK_SECRET=your-wati-webhook-secret
```

### Frontend (Vercel)
```env
NEXT_PUBLIC_API_BASE_URL=https://api.listmynest.in/v1
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your-google-maps-key
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Authentication Model

| Actor | Method | Scope | Token Expiry |
|---|---|---|---|
| **Buyer (anonymous)** | None | All GET /properties/**, POST /leads, POST /visits | — |
| **Buyer (verified)** | Soft OTP → buyer_token | POST/GET/DELETE /saved, POST /notify-me | 24h |
| **Seller** | OTP via MSG91 → JWT | Own listings CRUD, dashboard, photo upload | 24h |
| **Agent** | OTP via MSG91 → JWT | Assigned leads/visits, status updates | 24h |
| **Wati Webhook** | Webhook secret header | POST /leads/whatsapp-inbound only | — |
| **Admin** | Email+password or OTP → Admin JWT | All /admin/** + impersonation | 8h |

### Login Rules
- Buyers: **Never** required for browsing. OTP only for Notify Me + Save (after 3+ views)
- Sellers & Agents: OTP-based only, no passwords
- Admin: OTP or email+password
- Buyer token stored in `sessionStorage` (not localStorage — privacy safe)

---

## Business Rules & Constraints

### Listing Lifecycle Rules
- All new listings enter `PENDING_REVIEW` — agents verify before going `ACTIVE`
- Day 30: Auto-notification sent to seller if no activity
- Day 45: Auto-set to `INACTIVE` if no seller response
- `SOLD` badge shown for 7 days (48h in TRD), then listing hidden
- Inactive listings can be reactivated by seller at any time

### Agent Lead Routing
- Each property assigned to exactly **one agent** at listing creation (round-robin by city)
- If agent is inactive → auto-reassign to next active agent in same city
- Response SLA: 2 hours. Missed leads flagged, team lead notified
- 3 consecutive missed leads → agent removed from rotation pending review
- Multiple clicks on same property from same session within 1 hour = **single lead event**

### Contact Routing (Non-Negotiable)
- `Call Now` → dials assigned agent's number (never seller's)
- `WhatsApp` → opens WhatsApp to agent's number; Wati webhook captures buyer phone automatically
- All leads logged before contact action completes
- Session hash used to detect and rate-limit contact flooding

### Saved Listings
- Buyer must verify phone via OTP to save (one-time per device)
- Saved listings display real-time status: Active, Sold, Inactive
- Buyer notified if a saved listing changes status
- Saved tab kept for 7 days after a listing goes inactive

### Photo Rules
- Minimum 4 photos required to submit a listing
- Camera capture enforced on mobile (`capture='environment'`)
- GPS validation: soft flag if >500m from property address (not auto-rejected)
- Agent reviews GPS-flagged photos before approving listing

### Duplicate Detection
- Flag listings with same address, phone number, or photo hash
- Auto-hold for agent review

### 1-Tap Report
- Report button on every property detail page
- 3+ reports → auto-suspend listing pending review

---

## Performance Targets

### Frontend
| Metric | Target |
|---|---|
| First Contentful Paint (FCP) | < 2s on 4G, < 4s on 3G |
| Time to Interactive (TTI) | < 4s on mid-range Android |
| Listing page load (cached) | < 1.5s |
| Lighthouse score | > 80 on every deploy |

### Backend API
| Endpoint | P50 | P95 |
|---|---|---|
| GET /properties (cached) | < 80ms | < 200ms |
| GET /properties/{id} (cached) | < 80ms | < 200ms |
| GET /properties (cold) | < 300ms | < 600ms |
| POST /leads | < 150ms | < 400ms |
| POST /visits | < 200ms | < 500ms |
| POST /leads/whatsapp-inbound | < 100ms | < 250ms |
| POST /saved | < 150ms | < 350ms |
| GET /saved | < 100ms | < 250ms |

---

## Testing Requirements

| Test Type | Tool | Scope |
|---|---|---|
| Unit Tests | JUnit 5 + Mockito | 80%+ on service layer. Key: GpsValidationService, PropertyLifecycleScheduler, WatiWebhookHandler |
| Integration Tests | Spring Boot Test | All API endpoints including /saved, /buyers/otp, /notify-me, /leads/whatsapp-inbound |
| API Contract | Postman / Newman | All endpoints. Wati webhook payload simulation |
| Frontend E2E | Playwright | 5 critical flows: browse→wa-click, browse→schedule-visit, save(with OTP), notify-me sheet, saved-tab display |
| Load Test | k6 | 1000 concurrent users on /properties |
| Lifecycle Test | Scheduled job unit test | 30-day warn, 45-day inactive, sold badge 48h expiry |

---

## Deployment

### Database Migrations (Flyway)
Run in order:
```
V1__create_agents_sellers.sql
V2__create_properties.sql              # last_activity_at, sold_at columns
V3__create_property_photos.sql         # gps_flagged column
V4__create_leads.sql                   # buyer_phone, wa_intent, buyer_id
V5__create_visits.sql                  # buyer_phone NOT NULL, post_visit_wa_sent
V6__add_indexes.sql
V7__create_buyers.sql
V8__create_saved_listings.sql
V9__create_admins.sql
V10__create_admin_audit_log.sql
V11__add_impersonation_to_properties.sql  # impersonated_by_admin_id column
```

### Backend (Railway / Render)
- Build: `./gradlew bootJar`
- Deploy: Spring Boot JAR — free tier sufficient for Phase 1

### Frontend (Vercel)
- Auto-deploy on push to `main`
- SSR for property detail pages
- SSG with `revalidate: 300s` for homepage
- PWA via `next-pwa` + Workbox

### CDN
- Cloudflare in front of both frontend and backend for speed on rural 3G connections

---

## Phase 2 Roadmap (Post-MVP)

| Feature | Description | Phase 1 Dependency |
|---|---|---|
| Kannada Language UI | Full UI translation | i18n setup in Next.js from Day 1 |
| Agent Native PWA | Lightweight Android with offline visit status | Agent dashboard stable in Phase 1 |
| Seller Analytics Dashboard | Traffic, enquiry funnel, conversion rate | PostHog events from Phase 1 |
| City Expansion | Gulbarga, Latur, Solapur | City filter and routing from Phase 1 |
| Featured Listing Product | Paid tier to boost visibility | Listing rank logic from Phase 1 |
| Loan Partner Integration | NBFC/HFC referral link on detail page | No platform transaction involvement |
| Buyer Account & History | Full account with saved history and search alerts | OTP verification from Phase 1 |
| Post-Visit Buyer Feedback | 1-tap rating → builds seller trust score | Visits table from Phase 1 |

---

## Glossary

| Term | Definition |
|---|---|
| **Property ID** | Unique code e.g. `LMN-BDR-00142` — referenced in all WhatsApp messages |
| **Session Hash** | SHA-256 of user-agent + date + screen size — identifies session without PII |
| **Buyer Token** | JWT with role=BUYER, scope: saved listings only, 24h expiry |
| **WA Intent** | HOT / WARM / COLD — from buyer's reply (1/2/3) to post-visit Wati template |
| **GPS Soft Flag** | Photo flagged for agent review when GPS EXIF missing or >500m from property |
| **4-Moment Strategy** | WA Tap + Schedule Visit + Post-Visit WA + Notify Me — zero-friction phone capture |
| **Sold Badge (48h)** | Brief Sold indicator shown after seller marks sold, then archived |
| **PropertyLifecycleScheduler** | Daily Spring Boot job: 30-day warn, 45-day auto-inactive |
| **Verified Badge** | Trust marker on listings confirmed by a ListMyNest agent |
| **DPDP Act** | India's Digital Personal Data Protection Act — no PII collected for anonymous buyers |
| **Tier-3 City** | Indian cities with population 50,000–500,000, low app penetration, high WhatsApp usage |
| **ISR** | Incremental Static Regeneration — Next.js rebuilds static pages every N seconds in background |
| **FCM** | Firebase Cloud Messaging — push notifications to agents |
| **Wati Webhook** | HTTP POST from Wati when buyer sends any WA message — delivers buyer phone automatically |

---

*Document based on ListMyNest PRD v1.1 + TRD v1.2 · Phase 1 MVP · March 2026*
