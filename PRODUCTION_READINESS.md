# ListMyNest — Production Readiness Report

Honest audit for shipping to real users in Bidar / Karnataka tier-3 context.

---

## What is working (functional areas)

- Public property browse (featured + filters) and **property detail** with images (signed URLs when configured).
- **Lead logging** (WhatsApp / call / visit / save / notify paths) with dedupe + rate limits when Redis is healthy.
- **Visit scheduling** with seller + admin visibility; agent status updates API exists.
- **Seller** listing creation, photo upload pipeline (Supabase or mock), dashboard summaries.
- **Agent** dashboard surfaces (leads, visits, FCM token hook).
- **Admin** login, agents/sellers CRUD, property moderation, audit log endpoint, property detail page (frontend).
- **Flyway** migrations including **seed data** migration for demo accounts.
- **Auth:** seller/agent password, buyer OTP path, admin JWT, token refresh, seller self-register.
- **Geocoding** best-effort for new listings (Nominatim).

---

## Before real users — gaps & priorities

| Item | Missing / risk | Why it matters | Effort | Priority |
|------|----------------|----------------|--------|----------|
| **Global error UX** | Mixed raw codes (`PROPERTY_NOT_FOUND`) surfaced | Confuses non-technical users | 0.5–1 d | **CRITICAL** |
| **Monitoring & alerting** | No APM, no uptime ping to PagerDuty/Opsgenie | You learn about outages from angry users | 1–2 d | **CRITICAL** |
| **Structured logs → sink** | Logs stdout only by default | Hard to debug prod incidents | 0.5 d | **IMPORTANT** |
| **DB backups** | Relies on Supabase project backups | Data loss if misconfigured | Ops checklist | **CRITICAL** (ops) |
| **Redis SPOF behaviour** | Rate limits silently weaken; view counts noisy logs | Abuse / cost drift | 1 d | **IMPORTANT** |
| **Input validation coverage** | Some DTOs strong; not every edge case fuzz-tested | Bad data / odd Unicode | 1–2 d | **IMPORTANT** |
| **SQL injection** | JPA parameterized queries | Lower risk if no native SQL concatenation | Audit ongoing | **IMPORTANT** |
| **Malicious uploads** | MIME/size checks depend on client compression + storage policies | Malware hosting risk | 1 d | **IMPORTANT** |
| **JWT secret** | Default in `application.yml` for local | **Must rotate** in prod | 0.25 d | **CRITICAL** |
| **Hardcoded secrets scan** | Run `git secrets` / trufflehog | Prevent leaks | 0.25 d | **CRITICAL** |
| **Pagination completeness** | Many list endpoints paginate; verify all admin lists | UI freeze on large data | 0.5 d | **IMPORTANT** |
| **Supabase outage** | API errors 5xx; no circuit breaker | Broken experience | 1–2 d | **IMPORTANT** |
| **Firebase down** | Buyer OTP verify path fails | Save / notify flows blocked | 0.5 d | **IMPORTANT** |
| **Endpoint abuse** | Some public POSTs rely on Redis rate limits | If Redis down → weaker protection | 1 d | **IMPORTANT** |
| **Scheduler memory** | Jobs are batch queries; no unbounded in-memory growth spotted | Still needs soak test | 0.5 d | **NICE** |
| **Load test** | Not evidenced | Unknown tail latency | 2 d | **IMPORTANT** |

---

## Security checklist snapshot

- **JWT:** HS256 symmetric — protect secret; consider asymmetric keys if multi-service.
- **CORS:** Locked via env — verify prod origins only.
- **Phone exposure:** Audit any new DTOs before exposing seller/agent PII to buyers.
- **Admin impersonation:** Short TTL; audit trail exists — ensure UI warns admin.

---

## Launch recommendation

1. Fix **user-facing errors** + **logging sink** + **secret management**.  
2. Configure **Supabase backups** + **Redis** in prod path.  
3. Run **smoke + load** tests on staging.  
4. Only then invite unmoderated public traffic.

---

*Generated as part of engineering documentation package (`SYSTEM_DESIGN.md`, `ENHANCEMENTS.md`, `ARCHITECTURE.md`).*
