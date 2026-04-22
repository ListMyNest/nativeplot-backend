# ListMyNest — Phase 2+ Enhancement Backlog

Ordered by impact for **real users in Bidar** and nearby tier-3 markets.

---

## P0 — Trust, safety, scale

| Feature | User benefit | Code touchpoints | Effort |
|---------|--------------|------------------|--------|
| **Hardened rate limiting** | Stops spam clicks exhausting agents | `RedisService`, `LeadService`, API gateway or Bucket4j | M |
| **Listing quality score** | Buyers see best photos first | `PropertyListingAssembler`, admin review UI | M |
| **SMS delivery receipts** | Sellers trust OTP arrival | MSG91 callbacks, `AuthService` | S |

## P1 — Localisation & channels

| Feature | User benefit | Code touchpoints | Effort |
|---------|--------------|------------------|--------|
| **Kannada + English i18n** | Older users prefer Kannada labels | `next-intl` or `react-i18next`, extract strings from `app/` + `components/` | L |
| **WhatsApp Business API upgrade** | Official templates, higher throughput | Replace personal-WA deep links where needed; `WhatsAppService`, Wati templates | M |

## P2 — Discovery & maps

| Feature | User benefit | Code touchpoints | Effort |
|---------|--------------|------------------|--------|
| **Google Maps picker on add-listing** | Pin accuracy without geocode guess | `seller/add-listing`, new Maps JS component, lat/lng fields | M |
| **City expansion (Gulbarga, Latur)** | More inventory | Seed agents, `assigned_cities`, marketing | S–M |

## P3 — Monetisation & growth

| Feature | User benefit | Code touchpoints | Effort |
|---------|--------------|------------------|--------|
| **Featured paid tier** | Agents promote hot listings | `properties` columns `featured_until`, payment provider (Razorpay) webhooks | L |
| **Buyer account history** | Returning buyers see journey | Buyer dashboard page, APIs for saved + visits + leads | M |

## P4 — Seller & agent productivity

| Feature | User benefit | Code touchpoints | Effort |
|---------|--------------|------------------|--------|
| **Seller analytics charts** | Understand views & leads | `recharts` + `/sellers/me/dashboard` API enrichments | M |
| **Agent push improvements** | Faster response | FCM topic per city, notification preferences | M |

## P5 — Rural connectivity & PWA

| Feature | User benefit | Code touchpoints | Effort |
|---------|--------------|------------------|--------|
| **2G performance budget** | Faster loads on weak networks | Image CDN, route-based code splitting, reduce JS bundle | L |
| **Offline PWA reads** | Cached last viewed listings | `next-pwa` runtime caching strategy, stale-while-revalidate | M |

---

**Sizing key:** S ≤ 3 dev-days, M ≤ 2 weeks, L > 2 weeks (single engineer).

---

*This backlog should be groomed against the PRD roadmap quarterly.*
