# ListMyNest Backend — Architecture Decisions Log

> Add an entry every time you make a non-obvious technical decision.
> Paste this file into Cursor context at the start of new sessions.

## Format
```
## [Date] — [Component or area]
**Decision:** What you chose
**Why:** Reason
**Alternatives considered:** What you rejected and why
```

---

## [2026-03] — Two separate repos (frontend + backend)
**Decision:** Not a monorepo  
**Why:** Different deploy targets (Vercel vs Railway), different stacks, no shared code  
**Alternatives considered:** Turborepo — no real benefit for Java + Next.js with zero shared code

## [2026-03] — Auth strategy
**Decision:** Stateless JWT for seller/agent/admin; separate buyer_token for buyers  
**Why:** Buyers need zero friction for browsing — no session needed. Soft OTP only for save/notify-me.  
**Alternatives considered:** Spring Session — adds Redis coupling for something that doesn't need it

## [2026-03] — OTP storage
**Decision:** Redis only (never PostgreSQL) with TTL  
**Why:** OTPs are ephemeral by design. Redis TTL enforces expiry automatically.  
**Alternatives considered:** PostgreSQL with cleanup job — adds complexity and risks stale OTPs if job fails

## [2026-03] — View count buffering
**Decision:** Redis counter (TTL 60s) + batch flush to DB via ViewCountFlushScheduler  
**Why:** Property detail pages are high-traffic. Writing to DB on every view would be too slow.  
**Alternatives considered:** Direct DB write — P95 latency on /properties/{id} would exceed 200ms target

## [2026-03] — File upload
**Decision:** Supabase signed URLs — frontend uploads directly, backend never handles bytes  
**Why:** Avoids large multipart file handling on the API server, keeps the JAR memory footprint low  
**Alternatives considered:** Backend proxy upload — wastes memory and bandwidth on Railway free tier

## [2026-03] — Anti-bypass enforcement
**Decision:** seller_phone and agent_phone excluded at DTO layer (PublicPropertyDTO record)  
**Why:** Can't rely on frontend to strip fields — backend must be the single source of truth  
**Alternatives considered:** @JsonIgnore on entity — dangerous, entity might be used in admin context where phones are needed

---
<!-- Add new decisions above this line -->
