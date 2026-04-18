# ListMyNest — API Contracts (Frontend Quick Reference)

> Quick-reference for frontend developers. Full spec in TRD.md.
> Base URL: `process.env.NEXT_PUBLIC_API_BASE_URL` (never hardcode)

## Auth headers
| Token type     | Header                          | Who uses it              |
|----------------|---------------------------------|--------------------------|
| Seller/Agent   | `Authorization: Bearer <jwt>`   | Seller, Agent pages      |
| Buyer token    | `Authorization: Bearer <buyer_token>` | /saved endpoints   |
| Admin          | `Authorization: Bearer <admin_jwt>` | /admin/** pages      |
| No auth needed | —                               | All GET /properties, POST /leads, POST /visits |

## Critical: what you can and cannot show

| Field              | Show to buyer? | Notes                                      |
|--------------------|----------------|--------------------------------------------|
| seller_phone       | ❌ NEVER        | Never in any response DTO                  |
| agent_phone        | ❌ NEVER        | Only fetched via /whatsapp/link/{id}        |
| agent_wa_number    | ✅ After lead   | Only from /whatsapp/link/{id} post lead log |
| Price range (min/max) | ✅           | Display as "₹X – ₹Y Lakh", never exact    |
| Property address   | ✅ Area-level   | Show locality/area, not street address     |

## Public endpoints (no auth)

### Properties
```
GET  /properties              → list (params: city, type, price_min, price_max, page, size)
GET  /properties/{id}         → full detail (SSR — no seller/agent phone in response)
GET  /properties/featured     → active + verified, sorted by views
GET  /properties/search       → params: q, city
POST /properties/{id}/view    → record anonymous view (fire-and-forget)
```

### Leads (log before contact action)
```
POST /leads
Body: { property_id, lead_type: CALL|WHATSAPP|VISIT_REQUEST|NOTIFY_ME|SAVE, session_hash }
→ Always call this BEFORE completing any contact action
```

### Contact routing (after logging lead)
```
GET  /whatsapp/link/{propertyId}  → returns { wa_url, agent_number } — only after lead logged
```

### Visits
```
POST /visits
Body: { property_id, buyer_phone (REQUIRED), preferred_date, preferred_time, session_hash }
```

## Buyer auth (soft OTP)
```
POST /buyers/otp/send    Body: { phone }
POST /buyers/otp/verify  Body: { phone, otp } → returns { buyer_token, buyer_id }
```
Store buyer_token in **sessionStorage only**.

## Saved listings (requires buyer_token)
```
POST   /saved              Body: { property_id }
DELETE /saved/{propertyId}
GET    /saved              → list with real-time status (ACTIVE / SOLD / INACTIVE)
```

## Notify Me
```
POST /notify-me   Body: { phone, city, property_type? }
```

## Seller auth + listings
```
POST /auth/otp/send     Body: { phone }
POST /auth/otp/verify   Body: { phone, otp } → returns { token, role, user_id }
GET  /seller/properties → own listings
POST /properties        → create listing (enters PENDING_REVIEW)
PUT  /properties/{id}   → update own listing
PATCH /properties/{id}/status
PATCH /properties/{id}/sold
```

## Photo upload flow (seller)
```
1. POST /properties/{id}/photos/upload-url  → { signed_url, path }
2. PUT  {signed_url}  (direct to Supabase — backend never handles bytes)
3. POST /properties/{id}/photos  Body: { path, gps_lat?, gps_lng? }
```

## Agent endpoints
```
POST /auth/otp/send + verify  (same as seller, role=AGENT in response)
GET  /leads          → assigned leads
GET  /visits         → assigned visits
PATCH /visits/{id}/status   Body: { status: SCHEDULED|VISITED|NO_SHOW|CANCELLED }
```
